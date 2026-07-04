import type { Video } from "@prisma/client";
import type { ApiSort } from "@/lib/search-query";
import { computeRelevanceScore } from "@/lib/scoring";
import { sortVideosList } from "@/lib/video-sort";

function effectiveRating(v: Video): number {
  return v.rating > 0 ? v.rating : v.score;
}

function engagementFactor(v: Video): number {
  if (v.engagementRate > 0) return Math.min(v.engagementRate / 6, 1);
  if (v.views <= 0) return 0;
  return Math.min(((v.likes + v.comments) / v.views) * 100 / 6, 1);
}

/** Genuinely viral — freshness boost applies only to these. */
export function isGenuinelyViralVideo(v: Video): boolean {
  const viral = v.viralScore > 0 ? v.viralScore : effectiveRating(v);
  if (viral >= 58) return true;
  if (v.views >= 100_000) return true;
  if (v.views >= 25_000 && viral >= 48) return true;
  if (v.views >= 10_000 && viral >= 62) return true;
  return false;
}

function viewTierMultiplier(views: number, relevance: number): number {
  if (views < 2_000) return relevance >= 0.92 ? 0.45 : 0.12;
  if (views < 5_000) return relevance >= 0.88 ? 0.55 : 0.22;
  if (views < 10_000) return relevance >= 0.85 ? 0.68 : 0.38;
  if (views < 50_000) return 0.82;
  if (views < 100_000) return 0.94;
  if (views >= 1_000_000) return 1.32;
  if (views >= 500_000) return 1.2;
  if (views >= 100_000) return 1.08;
  return 1;
}

function freshnessMultiplier(v: Video, now: Date): number {
  const ageDays = (now.getTime() - v.publishedAt.getTime()) / 86_400_000;
  if (!isGenuinelyViralVideo(v)) {
    return ageDays <= 90 ? 1 : 0.97;
  }
  if (ageDays <= 3) return 1.18;
  if (ageDays <= 7) return 1.12;
  if (ageDays <= 14) return 1.08;
  if (ageDays <= 30) return 1.04;
  if (ageDays <= 90) return 1;
  return 0.95;
}

/**
 * Composite search score: relevance → viral → views → engagement → freshness (viral only).
 */
export function computeVideoSearchScore(video: Video, searchQuery: string, now: Date): number {
  const relevance = computeRelevanceScore(
    searchQuery,
    video.title,
    video.description ?? "",
    `${video.channelTitle ?? ""} ${video.authorDisplayName ?? ""} ${video.authorUsername ?? ""} ${video.sourceQuery ?? ""}`,
  );

  const viral = video.viralScore > 0 ? video.viralScore : effectiveRating(video);
  const viewLog = Math.log10(Math.max(video.views, 1));
  const engagement = engagementFactor(video);
  const fresh = freshnessMultiplier(video, now);
  const viewMul = viewTierMultiplier(video.views, relevance);

  const relevanceBoost = relevance >= 0.95 ? 1.2 : relevance >= 0.8 ? 1.08 : 1;

  const base =
    relevance * 130 +
    viral * 3.5 +
    viewLog * 26 +
    engagement * 32 +
    effectiveRating(video) * 0.35;

  return base * viewMul * fresh * relevanceBoost;
}

export function rankVideosForSearch(
  videos: Video[],
  searchQuery: string,
  sort: ApiSort,
  now: Date,
): Video[] {
  if (sort !== "viral_desc" && sort !== "viral_asc") {
    return sortVideosList(videos, sort);
  }

  const scored = videos.map((v) => ({
    v,
    s: computeVideoSearchScore(v, searchQuery, now),
  }));
  scored.sort((a, b) => (sort === "viral_desc" ? b.s - a.s : a.s - b.s));
  return scored.map((x) => x.v);
}
