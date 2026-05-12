import type { Prisma } from "@prisma/client";
import { compactErrorMeta, logAdminEvent } from "@/lib/admin-events";
import { isPublishedWithinPeriod } from "@/lib/period-filter";
import { prisma } from "@/lib/prisma";
import { computeUniversalVideoRating } from "@/lib/rating";
import {
  applyGarbagePenalty,
  computeRawScoreCore,
  computeRelevanceScore,
  hasGarbageKeywords,
  normalizeScores1to99,
} from "@/lib/scoring";
import { computeAgeHours, computeEngagementRate, computeViewsPerHour } from "@/lib/video-metrics";
import type { ApiSort, PeriodApi } from "@/lib/search-query";
import {
  fetchVideoDetails,
  parseYoutubeVideoItem,
  publishedAfterForPeriod,
  searchListOrder,
  searchYouTubeVideos,
  YouTubeApiError,
} from "@/lib/youtube";

type Draft = {
  parsed: NonNullable<ReturnType<typeof parseYoutubeVideoItem>>;
  ageHours: number;
  viewsPerHour: number;
  engagementRate: number;
  relevanceScore: number;
  rawScore: number;
};

export async function ingestYouTubeShortsForQuery(opts: {
  q: string;
  apiKey: string;
  region: string;
  language: string;
  period: PeriodApi;
  sort: ApiSort;
  minViews: number;
}): Promise<{ saved: number }> {
  try {
    return await ingestYouTubeShortsForQueryInner(opts);
  } catch (e) {
    const extra: Record<string, unknown> = { provider: "youtube", keyword: opts.q };
    if (e instanceof YouTubeApiError) {
      extra.status = e.status;
      extra.reason = e.reason;
    }
    await logAdminEvent({
      level: "error",
      type: "api_fetch",
      message: "YouTube ingest: ошибка",
      meta: compactErrorMeta(e, extra),
    });
    return { saved: 0 };
  }
}

async function ingestYouTubeShortsForQueryInner(opts: {
  q: string;
  apiKey: string;
  region: string;
  language: string;
  period: PeriodApi;
  sort: ApiSort;
  minViews: number;
}): Promise<{ saved: number }> {
  const now = new Date();
  const publishedAfter = publishedAfterForPeriod(opts.period);
  const order = searchListOrder(opts.sort);
  const effectiveMinViews = Math.max(500, opts.minViews);

  const ids = await searchYouTubeVideos({
    query: opts.q,
    apiKey: opts.apiKey,
    maxResults: 40,
    regionCode: opts.region || undefined,
    relevanceLanguage: opts.language || undefined,
    publishedAfter,
    order,
  });

  const rawItems = await fetchVideoDetails(ids, opts.apiKey);
  const parsed = rawItems
    .map(parseYoutubeVideoItem)
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
    .filter((v) => v.durationSeconds > 0 && v.durationSeconds <= 60 && v.views >= effectiveMinViews)
    .filter((v) => isPublishedWithinPeriod(v.publishedAt, opts.period, now));

  const drafts: Draft[] = [];
  for (const p of parsed) {
    const ageHours = computeAgeHours(p.publishedAt, now);
    const viewsPerHour = computeViewsPerHour(p.views, ageHours);
    const engagementRate = computeEngagementRate(p.likes, p.comments, p.views);
    const relevanceScore = computeRelevanceScore(
      opts.q,
      p.title,
      p.description ?? "",
      p.channelTitle ?? "",
    );
    let rawScore = computeRawScoreCore(p.views, viewsPerHour, engagementRate, relevanceScore);
    if (hasGarbageKeywords(p.title, p.description ?? "")) {
      rawScore = applyGarbagePenalty(rawScore);
    }
    drafts.push({ parsed: p, ageHours, viewsPerHour, engagementRate, relevanceScore, rawScore });
  }

  const positiveRel = drafts.filter((d) => d.relevanceScore > 0);
  const pool = positiveRel.length >= 4 ? positiveRel : [...drafts].sort((a, b) => b.rawScore - a.rawScore);
  const rawScores = pool.map((d) => d.rawScore);
  const normScores = normalizeScores1to99(rawScores);
  const fetchedAt = new Date();

  let saved = 0;
  for (let i = 0; i < pool.length; i++) {
    const d = pool[i];
    const p = d.parsed;
    const normScore = normScores[i] ?? 1;
    const rating = computeUniversalVideoRating({
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: 0,
      publishedAt: p.publishedAt,
      now,
      followerCount: null,
      retentionRate: null,
    });
    const blendedRating = Math.round((rating * 0.55 + normScore * 0.45) as number);
    const finalRating = Math.min(99, Math.max(0, blendedRating));
    const score = Math.min(99, Math.max(1, finalRating <= 0 ? normScore : finalRating));

    const data: Prisma.VideoCreateInput = {
      platform: "youtube",
      externalId: p.youtubeVideoId,
      url: p.url,
      title: p.title,
      description: p.description,
      thumbnailUrl: p.thumbnailUrl,
      videoUrl: null,
      publishedAt: p.publishedAt,
      durationSeconds: p.durationSeconds,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: 0,
      language: (p.language ?? opts.language) || null,
      region: opts.region || null,
      sourceQuery: opts.q,
      niche: null,
      ageHours: d.ageHours,
      relevanceScore: d.relevanceScore,
      rawScore: d.rawScore,
      score,
      rating: finalRating,
      viralScore: d.rawScore,
      viewsPerHour: d.viewsPerHour,
      engagementRate: d.engagementRate,
      channelId: p.channelId,
      channelTitle: p.channelTitle,
      authorUsername: null,
      authorDisplayName: p.channelTitle,
      authorAvatarUrl: null,
      subtitlesUrl: null,
      followerCount: null,
      retentionRate: null,
      usefulRaw: null,
      cacheUrl: null,
      lastFetchedAt: fetchedAt,
    };

    await prisma.video.upsert({
      where: {
        platform_externalId: { platform: "youtube", externalId: p.youtubeVideoId },
      },
      create: data,
      update: {
        url: data.url,
        title: data.title,
        description: data.description,
        channelId: data.channelId,
        channelTitle: data.channelTitle,
        thumbnailUrl: data.thumbnailUrl,
        publishedAt: data.publishedAt,
        durationSeconds: data.durationSeconds,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: 0,
        language: data.language,
        region: data.region,
        sourceQuery: data.sourceQuery,
        ageHours: data.ageHours,
        relevanceScore: data.relevanceScore,
        rawScore: data.rawScore,
        score: data.score,
        rating: data.rating,
        viralScore: data.viralScore,
        viewsPerHour: data.viewsPerHour,
        engagementRate: data.engagementRate,
        authorDisplayName: data.authorDisplayName,
        lastFetchedAt: fetchedAt,
      },
    });
    saved++;
  }

  await logAdminEvent({
    level: "info",
    type: "api_fetch",
    message: "YouTube ingest: успех",
    meta: { provider: "youtube", keyword: opts.q, videoIds: ids.length, saved },
  });

  return { saved };
}
