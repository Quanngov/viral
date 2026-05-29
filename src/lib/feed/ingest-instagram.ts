import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeUniversalVideoRating } from "@/lib/rating";
import type { NormalizedInstagramReel } from "@/lib/providers/tikhubInstagram";
import {
  applyGarbagePenalty,
  computeRawScoreCore,
  computeRelevanceScore,
  hasGarbageKeywords,
} from "@/lib/scoring";
import { computeAgeHours, computeEngagementRate, computeViewsPerHour } from "@/lib/video-metrics";

function buildUpsertData(
  reel: NormalizedInstagramReel,
  q: string,
  rating: number,
  now: Date,
  rootCacheUrl: string | null,
): Prisma.VideoCreateInput {
  const ageHours = computeAgeHours(reel.publishedAt, now);
  const viewsPerHour = computeViewsPerHour(reel.views, ageHours);
  const engagementRate = computeEngagementRate(reel.likes, reel.comments, reel.views);
  const relevanceScore = computeRelevanceScore(
    q,
    reel.title,
    reel.description ?? "",
    reel.authorDisplayName ?? reel.authorUsername ?? "",
  );
  let rawScore = computeRawScoreCore(reel.views, viewsPerHour, engagementRate, relevanceScore);
  if (hasGarbageKeywords(reel.title, reel.description ?? "")) {
    rawScore = applyGarbagePenalty(rawScore);
  }
  const score = Math.min(99, Math.max(1, rating));

  return {
    platform: "instagram",
    externalId: reel.externalId,
    url: reel.url,
    title: reel.title,
    description: reel.description,
    thumbnailUrl: reel.thumbnailUrl,
    videoUrl: reel.videoUrl,
    publishedAt: reel.publishedAt,
    durationSeconds: reel.durationSeconds,
    views: reel.views,
    likes: reel.likes,
    comments: reel.comments,
    shares: reel.shares,
    language: reel.language,
    region: null,
    sourceQuery: q,
    ageHours,
    relevanceScore,
    rawScore,
    score,
    rating,
    viralScore: rawScore,
    viewsPerHour,
    engagementRate,
    channelId: null,
    channelTitle: reel.authorDisplayName ?? reel.authorUsername,
    authorUsername: reel.authorUsername,
    authorDisplayName: reel.authorDisplayName,
    authorAvatarUrl: reel.authorAvatarUrl,
    subtitlesUrl: reel.subtitlesUrl,
    followerCount: reel.followerCount,
    retentionRate: null,
    usefulRaw: reel.usefulRaw,
    cacheUrl: rootCacheUrl,
    lastFetchedAt: now,
  };
}

export async function upsertInstagramReelsFromTikHub(
  reels: NormalizedInstagramReel[],
  q: string,
  rootCacheUrl: string | null,
): Promise<number> {
  const now = new Date();
  let n = 0;
  for (const reel of reels) {
    const rating = computeUniversalVideoRating({
      views: reel.views,
      likes: reel.likes,
      comments: reel.comments,
      shares: reel.shares,
      publishedAt: reel.publishedAt,
      now,
      followerCount: reel.followerCount,
      retentionRate: null,
    });
    const data = buildUpsertData(reel, q, rating, now, rootCacheUrl);
    await prisma.video.upsert({
      where: {
        platform_externalId: { platform: "instagram", externalId: reel.externalId },
      },
      create: data,
      update: {
        url: data.url,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        ...(data.thumbnailUrl
          ? { thumbnailStatus: "valid" as const, thumbnailFailCount: 0 }
          : {}),
        videoUrl: data.videoUrl,
        publishedAt: data.publishedAt,
        durationSeconds: data.durationSeconds,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        language: data.language,
        sourceQuery: data.sourceQuery,
        ageHours: data.ageHours,
        relevanceScore: data.relevanceScore,
        rawScore: data.rawScore,
        score: data.score,
        rating: data.rating,
        viralScore: data.viralScore,
        viewsPerHour: data.viewsPerHour,
        engagementRate: data.engagementRate,
        channelTitle: data.channelTitle,
        authorUsername: data.authorUsername,
        authorDisplayName: data.authorDisplayName,
        authorAvatarUrl: data.authorAvatarUrl,
        subtitlesUrl: data.subtitlesUrl,
        followerCount: data.followerCount,
        usefulRaw: data.usefulRaw,
        cacheUrl: data.cacheUrl ?? undefined,
        lastFetchedAt: now,
      },
    });
    n++;
  }
  return n;
}
