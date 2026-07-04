/**
 * Daily videos counter for the landing hero.
 *
 * Data source is swappable — set `USE_LIVE_DAILY_VIDEOS_COUNT = true` and implement
 * `fetchLiveDailyVideosCount` when the main ViralCloud API exposes today's count.
 */

/** Set to `true` when wiring to ViralCloud API (see `fetchLiveDailyVideosCount`). */
export const USE_LIVE_DAILY_VIDEOS_COUNT = false;

const MIN_DAILY = 800;
const MAX_DAILY = 2300;

export type DailyVideosCountSource = {
  /** Sync resolver (deterministic mock). */
  getSyncCount: (date?: Date) => number;
  /** Async resolver (live API). Return `null` to keep the sync fallback. */
  fetchLiveCount?: () => Promise<number | null>;
};

/** Deterministic UTC calendar day key — stable across refreshes on the same day. */
export function dailyVideosDateKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Mock: same value all day, new value each UTC day, range 800–2300. */
export function getDeterministicDailyVideosCount(date = new Date()): number {
  const dateKey = dailyVideosDateKey(date);
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (Math.imul(31, hash) + dateKey.charCodeAt(i)) >>> 0;
  }
  return MIN_DAILY + (hash % (MAX_DAILY - MIN_DAILY + 1));
}

/**
 * Future: fetch today's analyzed count from ViralCloud.
 * @example
 * const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stats/daily-videos`);
 * return (await res.json()).count ?? null;
 */
export async function fetchLiveDailyVideosCount(): Promise<number | null> {
  return null;
}

export const dailyVideosCountSource: DailyVideosCountSource = {
  getSyncCount: getDeterministicDailyVideosCount,
  fetchLiveCount: fetchLiveDailyVideosCount,
};

/** @deprecated Use `getDeterministicDailyVideosCount` */
export function getDailyVideosAnalyzedCount(date = new Date()): number {
  return getDeterministicDailyVideosCount(date);
}

export function formatDailyVideosAnalyzedCount(count: number, locale = "ru-RU"): string {
  return count.toLocaleString(locale);
}
