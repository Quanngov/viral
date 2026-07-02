import { cachedFetch, invalidateCached, peekCached, seedCached } from "@/lib/client-fetch-cache";
import type { DashboardInitialPayload } from "@/lib/dashboard-initial";
import { HOME_SSR_LIMIT } from "@/lib/dashboard-initial";
import type { GridVideo } from "@/lib/mock-data";
import { filterDisplayableVideos } from "@/lib/grid-video-display";

/** Persisted home grid (12–24 cards) — survives reload. */
export const HOME_GRID_CACHE_KEY = "api:videos:home:grid";
const HOME_GRID_STALE_MS = 30 * 60_000;
const TRENDS_STALE_MS = 30 * 60_000;

/** @deprecated Import typed helpers (peekHomeCache, etc.) from this module instead. */
export { peekCached } from "@/lib/client-fetch-cache";

export const CACHE_KEYS = {
  trends: "api:trends:realtime:10",
  home: (limit: number, skip = 0) => `api:videos:home:${limit}:${skip}`,
  tokens: "api:tokens",
  savedMap: "api:saved-videos:map",
  savedList: "api:saved-videos:list",
  competitorsBase: "api:competitors:base",
} as const;

export type HomePayload = { videos: GridVideo[]; totalCount: number | null };

export async function fetchHomeVideos(
  limit: number,
  opts?: { skip?: number },
): Promise<HomePayload> {
  const skipQ = opts?.skip ? `&skip=${opts.skip}` : "";
  const res = await fetch(`/api/videos/home?limit=${limit}${skipQ}`);
  const data = (await res.json()) as { videos?: GridVideo[] };
  return {
    videos: Array.isArray(data.videos) ? data.videos : [],
    totalCount: null,
  };
}

/** Lazy stats — does not block grid paint. */
export async function fetchHomeVideoCountLazy(): Promise<number | null> {
  const res = await fetch("/api/videos/home?countOnly=1");
  if (!res.ok) return null;
  const data = (await res.json()) as { totalCount?: number };
  return typeof data.totalCount === "number" ? data.totalCount : null;
}

export function peekHomeCache(limit: number, skip = 0): HomePayload | null {
  return peekCached<HomePayload>(CACHE_KEYS.home(limit, skip), 120_000, true);
}

export function loadHomeVideos(limit: number, opts?: { persist?: boolean; skip?: number }) {
  const cacheKey = CACHE_KEYS.home(limit, opts?.skip ?? 0);
  return cachedFetch(cacheKey, () => fetchHomeVideos(limit, { skip: opts?.skip }), {
    ttlMs: 120_000,
    staleMs: 600_000,
    persist: opts?.persist ?? limit >= 24,
  });
}

export async function fetchTokenBalance(): Promise<number | null> {
  const res = await fetch("/api/tokens");
  if (!res.ok) return null;
  const data = (await res.json()) as { balance?: number };
  return typeof data.balance === "number" ? data.balance : null;
}

export function loadTokenBalance() {
  return cachedFetch(CACHE_KEYS.tokens, fetchTokenBalance, { ttlMs: 45_000, staleMs: 120_000 });
}

export function invalidateTokenBalanceCache(): void {
  invalidateCached(CACHE_KEYS.tokens);
}

/** Обновить кэш баланса после spend (без ожидания TTL). */
export function publishTokenBalance(balance: number): void {
  seedCached(CACHE_KEYS.tokens, balance);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("viral:tokens-updated", { detail: { balance } }));
  }
}

export type TrendsPayload = {
  trends: unknown[];
  newItems: unknown[];
};

export async function fetchRealtimeTrends(): Promise<TrendsPayload> {
  const res = await fetch("/api/trends/realtime?limit=10");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.message || "API error");
  return {
    trends: Array.isArray(data.trends) ? data.trends : [],
    newItems: Array.isArray(data.newItems) ? data.newItems : [],
  };
}

export function peekTrendsCache(): TrendsPayload | null {
  return peekCached<TrendsPayload>(CACHE_KEYS.trends, TRENDS_STALE_MS, true);
}

export function persistTrendsCache(trends: TrendsPayload): void {
  seedCached(CACHE_KEYS.trends, trends, { persist: true });
}

export function loadRealtimeTrends() {
  return cachedFetch(CACHE_KEYS.trends, fetchRealtimeTrends, {
    ttlMs: 120_000,
    staleMs: TRENDS_STALE_MS,
    persist: true,
  });
}

export function peekHomeGridCache(): HomePayload | null {
  const raw = peekCached<HomePayload>(HOME_GRID_CACHE_KEY, HOME_GRID_STALE_MS, true);
  if (!raw?.videos?.length) return null;
  return { videos: filterDisplayableVideos(raw.videos), totalCount: raw.totalCount ?? null };
}

export function persistHomeGridCache(videos: GridVideo[]): void {
  const valid = filterDisplayableVideos(videos);
  if (valid.length === 0) return;
  seedCached(
    HOME_GRID_CACHE_KEY,
    { videos: valid, totalCount: null } satisfies HomePayload,
    { persist: true },
  );
}

export async function fetchSavedMap(): Promise<Record<string, boolean>> {
  const res = await fetch("/api/saved-videos");
  if (!res.ok) return {};
  const data = (await res.json()) as { videos?: { platform: string; externalId: string }[] };
  const videos = data.videos ?? [];
  seedCached(
    CACHE_KEYS.savedList,
    { videos } satisfies SavedListPayload,
    { persist: true },
  );
  const next: Record<string, boolean> = {};
  for (const v of videos) {
    next[`${v.platform}:${v.externalId}`] = true;
  }
  return next;
}

export function loadSavedMap() {
  return cachedFetch(CACHE_KEYS.savedMap, fetchSavedMap, { ttlMs: 90_000, staleMs: 300_000, persist: true });
}

export type SavedListPayload = { videos: unknown[] };

export async function fetchSavedVideosList(): Promise<SavedListPayload> {
  const res = await fetch("/api/saved-videos");
  if (!res.ok) return { videos: [] };
  const data = (await res.json()) as { videos?: unknown[] };
  return { videos: Array.isArray(data.videos) ? data.videos : [] };
}

export function peekSavedListCache(): SavedListPayload | null {
  return peekCached<SavedListPayload>(CACHE_KEYS.savedList, 300_000, true);
}

export function loadSavedVideosList() {
  return cachedFetch(CACHE_KEYS.savedList, fetchSavedVideosList, {
    ttlMs: 90_000,
    staleMs: 300_000,
    persist: true,
  });
}

export type CompetitorsBasePayload = {
  competitors: unknown[];
  videos: unknown[];
};

export async function fetchCompetitorsBase(): Promise<CompetitorsBasePayload> {
  const [competitorsRes, videosRes] = await Promise.all([
    fetch("/api/competitors"),
    fetch("/api/competitors/videos"),
  ]);
  const competitorsData = (await competitorsRes.json()) as { competitors?: unknown[] };
  const videosData = (await videosRes.json()) as { videos?: unknown[] };
  return {
    competitors: Array.isArray(competitorsData.competitors) ? competitorsData.competitors : [],
    videos: Array.isArray(videosData.videos) ? videosData.videos : [],
  };
}

export function peekCompetitorsBaseCache(): CompetitorsBasePayload | null {
  return peekCached<CompetitorsBasePayload>(CACHE_KEYS.competitorsBase, 300_000);
}

export function prefetchCompetitorsBase() {
  return cachedFetch(CACHE_KEYS.competitorsBase, fetchCompetitorsBase, {
    ttlMs: 120_000,
    staleMs: 300_000,
  });
}

/** After SSR — persist trends; home grid only if no richer cache yet. */
export function seedDashboardFromSsr(initial: DashboardInitialPayload): void {
  const ssrVideos = filterDisplayableVideos(initial.homeVideos);
  const existing = peekHomeGridCache();
  if (!existing?.videos?.length || ssrVideos.length > existing.videos.length) {
    persistHomeGridCache(ssrVideos);
  }
  seedCached(CACHE_KEYS.home(HOME_SSR_LIMIT, 0), { videos: ssrVideos, totalCount: null });
  persistTrendsCache(initial.trends);
}
