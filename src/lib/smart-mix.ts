import type { Video } from "@prisma/client";
import type { ApiSort, FeedPlatformMode } from "@/lib/search-query";
import { sortVideosList } from "@/lib/video-sort";

export type SmartMixMode = "search" | "more";

export type PickSmartMixOptions = {
  mode: SmartMixMode;
  now: Date;
  platformFilter: FeedPlatformMode;
  minViewsFloor: number;
  mixSeed: string;
  sort: ApiSort;
};

/** Ступени порога качества: ослабляем только если не хватает роликов. */
export const QUALITY_FLOOR_STEPS = [60, 55, 50, 45] as const;

export const MIN_FEED_EFFECTIVE_RATING = QUALITY_FLOOR_STEPS[QUALITY_FLOOR_STEPS.length - 1];

export function effectiveRating(v: Video): number {
  return v.rating > 0 ? v.rating : v.score;
}

function ratingOf(v: Pick<Video, "rating" | "score">): number {
  return v.rating > 0 ? v.rating : v.score;
}

export function meetsFeedQualityFloor(v: Pick<Video, "rating" | "score">, floor: number): boolean {
  return ratingOf(v) >= floor;
}

/** Адаптивный порог: 60 → 55 → 50 → 45, пока не наберём targetCount. */
export function filterWithAdaptiveQualityFloor<T extends Pick<Video, "rating" | "score">>(
  videos: T[],
  targetCount: number,
): T[] {
  if (videos.length === 0) return [];
  for (const floor of QUALITY_FLOOR_STEPS) {
    const filtered = videos.filter((v) => meetsFeedQualityFloor(v, floor));
    if (filtered.length >= targetCount || floor === MIN_FEED_EFFECTIVE_RATING) {
      return filtered;
    }
  }
  return videos;
}

function viewTierBoost(views: number): number {
  if (views >= 1_000_000) return 1.5;
  if (views >= 500_000) return 1.35;
  if (views >= 100_000) return 1.2;
  if (views >= 50_000) return 1.1;
  if (views >= 10_000) return 1.02;
  return 1;
}

function ageFreshnessBoost(v: Video, now: Date): number {
  const age = (now.getTime() - v.publishedAt.getTime()) / 86400000;
  if (age <= 7) return 1.08;
  if (age <= 30) return 1.03;
  return 1;
}

/** Сила ролика для режима «вирусность»: viralScore + просмотры + рейтинг. */
export function computeFeedStrength(v: Video, now: Date): number {
  const viral = v.viralScore > 0 ? v.viralScore : 0;
  const rating = effectiveRating(v);
  const viewLog = Math.log10(Math.max(v.views, 1));
  return (viral * 2 + rating) * viewLog * viewTierBoost(v.views) * ageFreshnessBoost(v, now);
}

/**
 * Выдача с учётом sort: без shuffle-бакетов, с адаптивным quality floor.
 */
export function pickFeedBatch(
  candidates: Video[],
  _batchIndex: number,
  size: number,
  opts: PickSmartMixOptions,
): Video[] {
  if (candidates.length === 0 || size <= 0) return [];

  const pool = filterWithAdaptiveQualityFloor(candidates, size);
  if (pool.length === 0) return [];

  let sorted: Video[];
  if (opts.sort === "viral_desc" || opts.sort === "viral_asc") {
    sorted = [...pool].sort((a, b) => {
      const sa = computeFeedStrength(a, opts.now);
      const sb = computeFeedStrength(b, opts.now);
      return opts.sort === "viral_desc" ? sb - sa : sa - sb;
    });
  } else {
    sorted = sortVideosList(pool, opts.sort);
  }

  return sorted.slice(0, size);
}

/** @deprecated Используйте pickFeedBatch. */
export function pickSmartMixedBatch(
  candidates: Video[],
  batchIndex: number,
  size: number,
  opts: Omit<PickSmartMixOptions, "sort"> & { sort?: ApiSort },
): Video[] {
  return pickFeedBatch(candidates, batchIndex, size, {
    ...opts,
    sort: opts.sort ?? "viral_desc",
  });
}
