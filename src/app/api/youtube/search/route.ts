import { NextResponse } from "next/server";
import type { Video } from "@prisma/client";
import { isPublishedWithinPeriod } from "@/lib/period-filter";
import { prisma } from "@/lib/prisma";
import type { ApiSort, PeriodApi } from "@/lib/search-query";
import {
  applyGarbagePenalty,
  computeRawScoreCore,
  computeRelevanceScore,
  hasGarbageKeywords,
  normalizeScores1to99,
} from "@/lib/scoring";
import { videoToClientJson } from "@/lib/serialize-video";
import { sortVideosList } from "@/lib/video-sort";
import {
  computeAgeHours,
  computeEngagementRate,
  computeViewsPerHour,
} from "@/lib/video-metrics";
import {
  fetchVideoDetails,
  parseYoutubeVideoItem,
  publishedAfterForPeriod,
  searchListOrder,
  searchYouTubeVideos,
  YouTubeApiError,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";

const SORTS: ApiSort[] = [
  "views_desc",
  "views_asc",
  "date_desc",
  "date_asc",
  "viral_desc",
  "viral_asc",
];

const PERIODS: PeriodApi[] = [
  "today",
  "yesterday",
  "week",
  "month",
  "year",
  "all",
];

function parseSort(raw: string | null): ApiSort {
  if (raw && SORTS.includes(raw as ApiSort)) return raw as ApiSort;
  return "viral_desc";
}

function parsePeriod(raw: string | null): PeriodApi {
  if (raw && PERIODS.includes(raw as PeriodApi)) return raw as PeriodApi;
  return "week";
}

function cacheKeyFrom(parts: {
  q: string;
  region: string;
  language: string;
  sort: string;
  period: string;
  minViews: number;
}) {
  return [parts.q, parts.region, parts.language, parts.sort, parts.period, parts.minViews].join("|");
}

async function dbVideoTotal(): Promise<number> {
  return prisma.video.count();
}

async function loadVideosByYoutubeIds(ids: string[]): Promise<Video[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.video.findMany({
    where: { youtubeVideoId: { in: ids } },
  });
  const map = new Map(rows.map((r) => [r.youtubeVideoId, r]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Video[];
}

export async function GET(req: Request) {
  const totalCount = await dbVideoTotal();

  const { searchParams } = new URL(req.url);
  const qRaw = searchParams.get("q")?.trim() ?? "";
  if (!qRaw) {
    return NextResponse.json(
      { error: "bad_request", message: "Параметр q обязателен", totalCount },
      { status: 400 },
    );
  }

  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Задайте YOUTUBE_API_KEY в .env", totalCount },
      { status: 503 },
    );
  }

  const region = searchParams.get("region")?.trim() ?? "";
  const language = searchParams.get("language")?.trim() ?? "";
  const period = parsePeriod(searchParams.get("period"));
  const sort = parseSort(searchParams.get("sort"));
  const minViewsRaw = Number(searchParams.get("minViews") ?? "0");
  const minViews = Number.isFinite(minViewsRaw) ? Math.max(0, Math.floor(minViewsRaw)) : 0;
  const effectiveMinViews = Math.max(500, minViews);

  const ck = cacheKeyFrom({
    q: qRaw,
    region,
    language,
    period,
    sort,
    minViews,
  });

  const now = new Date();
  const cached = await prisma.searchCache.findUnique({ where: { cacheKey: ck } });

  if (cached && cached.expiresAt > now) {
    let ids: string[] = [];
    try {
      ids = JSON.parse(cached.videoIdsJson) as string[];
    } catch {
      ids = [];
    }
    const rows = await loadVideosByYoutubeIds(ids);
    const filtered = rows.filter((v) => v.views >= effectiveMinViews);
    const sorted = sortVideosList(filtered, sort);
    const tc = await dbVideoTotal();
    return NextResponse.json({
      source: "cache",
      videos: sorted.map(videoToClientJson),
      totalCount: tc,
      foundCount: sorted.length,
    });
  }

  try {
    const publishedAfter = publishedAfterForPeriod(period);
    const order = searchListOrder(sort);
    const ids = await searchYouTubeVideos({
      query: qRaw,
      apiKey: key,
      maxResults: 50,
      regionCode: region || undefined,
      relevanceLanguage: language || undefined,
      publishedAfter,
      order,
    });

    const rawItems = await fetchVideoDetails(ids, key);
    const parsed = rawItems
      .map(parseYoutubeVideoItem)
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .filter((v) => v.durationSeconds > 0 && v.durationSeconds <= 60 && v.views >= effectiveMinViews)
      .filter((v) => isPublishedWithinPeriod(v.publishedAt, period, now));

    type Draft = {
      parsed: NonNullable<ReturnType<typeof parseYoutubeVideoItem>>;
      ageHours: number;
      viewsPerHour: number;
      engagementRate: number;
      relevanceScore: number;
      rawScore: number;
    };

    const drafts: Draft[] = [];

    for (const p of parsed) {
      const ageHours = computeAgeHours(p.publishedAt, now);
      const viewsPerHour = computeViewsPerHour(p.views, ageHours);
      const engagementRate = computeEngagementRate(p.likes, p.comments, p.views);
      const relevanceScore = computeRelevanceScore(
        qRaw,
        p.title,
        p.description ?? "",
        p.channelTitle ?? "",
      );
      let rawScore = computeRawScoreCore(p.views, viewsPerHour, engagementRate, relevanceScore);
      if (hasGarbageKeywords(p.title, p.description ?? "")) {
        rawScore = applyGarbagePenalty(rawScore);
      }
      drafts.push({
        parsed: p,
        ageHours,
        viewsPerHour,
        engagementRate,
        relevanceScore,
        rawScore,
      });
    }

    const positiveRel = drafts.filter((d) => d.relevanceScore > 0);
    const pool = positiveRel.length >= 6 ? positiveRel : [...drafts].sort((a, b) => b.rawScore - a.rawScore);

    const rawScores = pool.map((d) => d.rawScore);
    const normScores = normalizeScores1to99(rawScores);

    const fetchedAt = new Date();
    const saved: Video[] = [];

    for (let i = 0; i < pool.length; i++) {
      const d = pool[i];
      const p = d.parsed;
      const score = normScores[i] ?? 1;

      const row = await prisma.video.upsert({
        where: { youtubeVideoId: p.youtubeVideoId },
        create: {
          youtubeVideoId: p.youtubeVideoId,
          platform: "youtube",
          url: p.url,
          title: p.title,
          description: p.description,
          channelId: p.channelId,
          channelTitle: p.channelTitle,
          thumbnailUrl: p.thumbnailUrl,
          publishedAt: p.publishedAt,
          durationSeconds: p.durationSeconds,
          views: p.views,
          likes: p.likes,
          comments: p.comments,
          language: (p.language ?? language) || null,
          region: region || null,
          sourceQuery: qRaw,
          ageHours: d.ageHours,
          relevanceScore: d.relevanceScore,
          rawScore: d.rawScore,
          score,
          viralScore: d.rawScore,
          viewsPerHour: d.viewsPerHour,
          engagementRate: d.engagementRate,
          lastFetchedAt: fetchedAt,
        },
        update: {
          url: p.url,
          title: p.title,
          description: p.description,
          channelId: p.channelId,
          channelTitle: p.channelTitle,
          thumbnailUrl: p.thumbnailUrl,
          publishedAt: p.publishedAt,
          durationSeconds: p.durationSeconds,
          views: p.views,
          likes: p.likes,
          comments: p.comments,
          language: (p.language ?? language) || null,
          region: region || null,
          sourceQuery: qRaw,
          ageHours: d.ageHours,
          relevanceScore: d.relevanceScore,
          rawScore: d.rawScore,
          score,
          viralScore: d.rawScore,
          viewsPerHour: d.viewsPerHour,
          engagementRate: d.engagementRate,
          lastFetchedAt: fetchedAt,
        },
      });
      saved.push(row);
    }

    const sorted = sortVideosList(saved, sort);
    const sortedIds = sorted.map((v) => v.youtubeVideoId);
    const expiresAt = new Date(now.getTime() + 12 * 3600 * 1000);

    await prisma.searchCache.upsert({
      where: { cacheKey: ck },
      create: {
        cacheKey: ck,
        query: qRaw,
        region: region || null,
        language: language || null,
        period,
        sort,
        videoIdsJson: JSON.stringify(sortedIds),
        expiresAt,
      },
      update: {
        query: qRaw,
        region: region || null,
        language: language || null,
        period,
        sort,
        videoIdsJson: JSON.stringify(sortedIds),
        expiresAt,
      },
    });

    const totalAfter = await dbVideoTotal();

    return NextResponse.json({
      source: "youtube",
      videos: sorted.map(videoToClientJson),
      totalCount: totalAfter,
      foundCount: sorted.length,
    });
  } catch (e) {
    if (e instanceof YouTubeApiError) {
      const msg = e.message || "Ошибка YouTube API";
      if (e.reason === "quotaExceeded" || /quota/i.test(msg)) {
        return NextResponse.json(
          {
            error: "quota_exceeded",
            message: "Превышена квота YouTube API. Попробуйте позже.",
            totalCount: await dbVideoTotal(),
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error: "youtube_api",
          message: msg,
          status: e.status,
          totalCount: await dbVideoTotal(),
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "internal", message: "Не удалось выполнить поиск", totalCount: await dbVideoTotal() },
      { status: 500 },
    );
  }
}
