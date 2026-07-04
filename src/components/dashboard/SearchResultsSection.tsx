"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GridVideo } from "@/lib/mock-data";
import type { FeedPlatformMode } from "@/lib/search-query";
import { uiLocaleToApi, uiPeriodToApi } from "@/lib/search-query";
import { useAuthGateOptional } from "@/components/dashboard/AuthGateProvider";
import { SearchToolbar } from "@/components/dashboard/SearchToolbar";
import type { SearchFiltersPayload, SearchSubmitPayload } from "@/components/dashboard/SearchToolbar";
import type { SearchGridFilters } from "@/components/dashboard/search-results-utils";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { VideoGridSkeleton } from "@/components/dashboard/DashboardSkeletons";
import type { DashboardInitialPayload } from "@/lib/dashboard-initial";
import { HOME_SSR_LIMIT } from "@/lib/dashboard-initial";
import {
  fetchHomeVideoCountLazy,
  fetchHomeVideos,
  persistHomeGridCache,
  peekHomeGridCache,
  publishTokenBalance,
} from "@/lib/dashboard-fetch";
import { filterAndResolveDisplayableVideos } from "@/lib/grid-video-display";
import { useSavedVideos } from "@/components/dashboard/SavedVideosContext";
import { useToast } from "@/components/dashboard/ToastContext";
import {
  LOAD_MORE_PROGRESS_STEPS,
  SEARCH_PROGRESS_STEPS,
  SearchProgressPanel,
  useAnimatedSearchProgress,
} from "@/components/dashboard/SearchProgressPanel";
import { messageForHttpStatus, sanitizeClientErrorMessage } from "@/lib/api-user-messages";

const SEARCH_STEP_MS = 720;
const LOAD_MORE_STEP_MS = 560;

type SearchResultsSectionProps = {
  searchCost: number;
  initialHome: DashboardInitialPayload;
  onVideoClick?: (video: GridVideo) => void;
};

type FeedSession = {
  q: string;
  platform: FeedPlatformMode;
  locale: string;
};

export function SearchResultsSection({ searchCost, initialHome, onVideoClick }: SearchResultsSectionProps) {
  const { showToast } = useToast();
  const authGate = useAuthGateOptional();
  const { hydrateForVideos, lastError, clearError } = useSavedVideos();
  const ssrVideos = useMemo(
    () => filterAndResolveDisplayableVideos(initialHome.homeVideos),
    [initialHome.homeVideos],
  );
  const [sourceVideos, setSourceVideos] = useState<GridVideo[]>(ssrVideos);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [homeReady, setHomeReady] = useState(() => ssrVideos.length > 0);
  const [gridFadeIn, setGridFadeIn] = useState(() => ssrVideos.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [session, setSession] = useState<FeedSession | null>(null);
  const [noMore, setNoMore] = useState(false);
  const [appendFrom, setAppendFrom] = useState(0);
  const feedBatchIndexRef = useRef(1);

  const { phases: searchPhases, complete: completeSearchProgress } = useAnimatedSearchProgress(
    searchLoading,
    SEARCH_PROGRESS_STEPS,
    SEARCH_STEP_MS,
  );
  const { phases: loadMorePhases, complete: completeLoadMoreProgress } = useAnimatedSearchProgress(
    loadMoreLoading,
    LOAD_MORE_PROGRESS_STEPS,
    LOAD_MORE_STEP_MS,
  );

  const [filters, setFilters] = useState<SearchGridFilters>({
    languageMode: "world",
    sort: "viral_desc",
    period: "month",
    minViews: 0,
    platformMode: "all",
  });

  const videos = useMemo(() => sourceVideos, [sourceVideos]);

  useEffect(() => {
    if (sourceVideos.length === 0) return;
    const id = window.setTimeout(() => void hydrateForVideos(sourceVideos), 4_000);
    return () => window.clearTimeout(id);
  }, [sourceVideos, hydrateForVideos]);

  /** After hydration — restore persisted grid without SSR mismatch. */
  useEffect(() => {
    const cached = peekHomeGridCache();
    if (!cached?.videos.length) return;
    setSourceVideos(cached.videos);
    setHomeReady(true);
  }, []);

  useEffect(() => {
    let alive = true;

    if (ssrVideos.length > 0) {
      const countTimer = window.setTimeout(() => {
        void (async () => {
          try {
            const count = await fetchHomeVideoCountLazy();
            if (alive && count !== null) setTotalCount(count);
          } catch {
            /* stats optional */
          }
        })();
      }, 10_000);
      return () => {
        alive = false;
        window.clearTimeout(countTimer);
      };
    }

    const phase2 = window.setTimeout(() => {
      void (async () => {
        try {
          const { videos } = await fetchHomeVideos(HOME_SSR_LIMIT);
          if (!alive) return;
          const valid = filterAndResolveDisplayableVideos(videos);
          if (valid.length > 0) {
            persistHomeGridCache(valid);
            setSourceVideos(valid);
            setHomeReady(true);
          }
        } catch {
          if (!alive) return;
          setHomeReady(true);
        }
        if (!alive) return;
        await new Promise((r) => window.setTimeout(r, 5_000));
        if (!alive) return;
        try {
          const count = await fetchHomeVideoCountLazy();
          if (count !== null) setTotalCount(count);
        } catch {
          /* stats optional */
        }
      })();
    }, 5_000);

    return () => {
      alive = false;
      window.clearTimeout(phase2);
    };
  }, [ssrVideos.length]);

  function localeToLanguageMode(locale: string): "world" | "ru" | "en" {
    if (locale === "Русский") return "ru";
    if (locale === "Английский") return "en";
    return "world";
  }

  async function postFeed(body: Record<string, unknown>) {
    const res = await fetch("/api/videos/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, tokenCost: searchCost }),
    });
    const data = (await res.json()) as {
      videos?: GridVideo[];
      totalCount?: number;
      tokensOk?: boolean;
      tokensRemaining?: number;
      noMore?: boolean;
      message?: string;
      error?: string;
      userHint?: string;
    };
    return { res, data };
  }

  function applyTokensRemaining(tokensRemaining: number | undefined) {
    if (typeof tokensRemaining === "number") {
      publishTokenBalance(tokensRemaining);
    }
  }

  function mergeFeedVideos(prev: GridVideo[], chunk: GridVideo[]): GridVideo[] {
    const seen = new Set(prev.map((v) => v.id));
    const added = chunk.filter((v) => !seen.has(v.id));
    return [...prev, ...added];
  }

  async function runSearch(payload: SearchSubmitPayload) {
    const q = payload.q.trim();
    if (!q) return;
    if (authGate && !authGate.ensureRegistered("search", () => runSearch(payload))) return;

    setSearchLoading(true);
    setError(null);
    setNoMore(false);
    setAppendFrom(0);
    setSourceVideos([]);

    try {
      const { region, language } = uiLocaleToApi(payload.locale);
      const period = uiPeriodToApi(payload.period);
      const languageMode = localeToLanguageMode(payload.locale);

      setFilters({
        languageMode,
        sort: payload.sort,
        period,
        minViews: payload.minViews as 0 | 1000 | 10000 | 50000 | 100000 | 1000000,
        platformMode: payload.platform,
      });

      const { res, data } = await postFeed({
        action: "search",
        q,
        platform: payload.platform,
        seenIds: [],
        batchIndex: 0,
        period,
        sort: payload.sort,
        minViews: payload.minViews,
        languageMode,
        region,
        language,
      });

      applyTokensRemaining(data.tokensRemaining);

      if (res.status === 402 || data.tokensOk === false) {
        setError(messageForHttpStatus(402, data.message));
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `Ошибка ${res.status}`);
      }

      if (typeof data.userHint === "string" && data.userHint.trim()) {
        showToast(data.userHint.trim(), "warn");
      }

      setSession({ q, platform: payload.platform, locale: payload.locale });
      feedBatchIndexRef.current = 1;
      setAppendFrom(0);
      setSourceVideos(Array.isArray(data.videos) ? data.videos : []);
      setNoMore(Boolean(data.noMore));
      if (typeof data.totalCount === "number") setTotalCount(data.totalCount);
    } catch (e) {
      setError(sanitizeClientErrorMessage(e instanceof Error ? e.message : ""));
    } finally {
      completeSearchProgress();
      setSearchLoading(false);
    }
  }

  async function loadMore() {
    if (!session || searchLoading || loadMoreLoading) return;
    if (authGate && !authGate.ensureRegistered("load_more", () => loadMore())) return;
    setLoadMoreLoading(true);
    setError(null);
    try {
      const { region, language } = uiLocaleToApi(session.locale);
      const languageMode = filters.languageMode;

      const { res, data } = await postFeed({
        action: "more",
        q: session.q,
        platform: session.platform,
        seenIds: sourceVideos.map((v) => v.id),
        batchIndex: feedBatchIndexRef.current,
        period: filters.period,
        sort: filters.sort,
        minViews: filters.minViews,
        languageMode,
        region,
        language,
      });

      applyTokensRemaining(data.tokensRemaining);

      if (res.status === 402 || data.tokensOk === false) {
        setError(messageForHttpStatus(402, data.message));
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `Ошибка ${res.status}`);
      }

      if (typeof data.userHint === "string" && data.userHint.trim()) {
        showToast(data.userHint.trim(), "warn");
      }

      const chunk = Array.isArray(data.videos) ? data.videos : [];
      if (chunk.length === 0 && data.noMore) {
        setNoMore(true);
        setError(null);
      } else {
        let appendStart = 0;
        setSourceVideos((prev) => {
          appendStart = prev.length;
          return mergeFeedVideos(prev, chunk);
        });
        setAppendFrom(appendStart);
        feedBatchIndexRef.current += 1;
        setNoMore(Boolean(data.noMore));
      }
      if (typeof data.totalCount === "number") setTotalCount(data.totalCount);
    } catch (e) {
      setError(sanitizeClientErrorMessage(e instanceof Error ? e.message : ""));
    } finally {
      completeLoadMoreProgress();
      setLoadMoreLoading(false);
    }
  }

  const onFiltersChange = useCallback((payload: SearchFiltersPayload) => {
    const period = uiPeriodToApi(payload.period);
    const languageMode = localeToLanguageMode(payload.locale);
    const nextMinViews = payload.minViews as 0 | 1000 | 10000 | 50000 | 100000 | 1000000;
    setFilters((prev) => {
      if (
        prev.languageMode === languageMode &&
        prev.sort === payload.sort &&
        prev.period === period &&
        prev.minViews === nextMinViews &&
        prev.platformMode === payload.platform
      ) {
        return prev;
      }
      return {
        languageMode,
        sort: payload.sort,
        period,
        minViews: nextMinViews,
        platformMode: payload.platform,
      };
    });
  }, []);

  useEffect(() => {
    if (!homeReady) {
      setGridFadeIn(false);
      return;
    }
    const id = requestAnimationFrame(() => setGridFadeIn(true));
    return () => cancelAnimationFrame(id);
  }, [homeReady]);

  const isSearchMode = Boolean(session);
  const showGridSkeleton = !isSearchMode && !homeReady;
  const displayedVideos = videos;
  const showLoadMore = Boolean(session) && !searchLoading && !loadMoreLoading && homeReady && !noMore;
  const showHomeEmpty = homeReady && !session && displayedVideos.length === 0;
  const showSearchEmpty = homeReady && session && !searchLoading && displayedVideos.length === 0;

  const statsParts: string[] = [];
  if (totalCount !== null) {
    statsParts.push(`В базе: ${totalCount} роликов`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-transparent px-0 pb-4 pt-1">
      <SearchToolbar
        searchCost={searchCost}
        searching={searchLoading}
        onSubmitSearch={runSearch}
        onFiltersChange={onFiltersChange}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {lastError ? (
        <p className="text-sm text-amber-800">
          {lastError}{" "}
          <button type="button" className="underline" onClick={clearError}>
            Закрыть
          </button>
        </p>
      ) : null}

      {searchLoading ? (
        <SearchProgressPanel steps={SEARCH_PROGRESS_STEPS} phases={searchPhases} />
      ) : null}

      {homeReady && noMore && session && videos.length === 0 && !searchLoading ? (
        <p className="text-sm text-zinc-600">Пока больше роликов нет.</p>
      ) : null}

      {homeReady && statsParts.length > 0 ? (
        <p className="text-xs text-zinc-600">{statsParts.join(" • ")}</p>
      ) : null}

      {showHomeEmpty ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center shadow-sm shadow-zinc-900/5">
          <p className="text-base font-semibold text-zinc-800">В базе пока нет роликов</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Выполните первый поиск по теме — подберём ролики из базы и внешних источников.
          </p>
        </div>
      ) : showSearchEmpty ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center shadow-sm shadow-zinc-900/5">
          <p className="text-base font-semibold text-zinc-800">Ничего не найдено</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Попробуйте другой запрос или нажмите «Показать еще», чтобы добрать новые ролики.
          </p>
        </div>
      ) : (
        <>
          {showGridSkeleton ? (
            <VideoGridSkeleton count={8} />
          ) : !searchLoading && (displayedVideos.length > 0 || !session) ? (
            <div
              className={`transition-opacity duration-500 ease-out ${
                gridFadeIn ? "opacity-100" : "opacity-0"
              }`}
            >
              <VideoGrid videos={displayedVideos} appendFrom={appendFrom} onVideoClick={onVideoClick} />
            </div>
          ) : null}
          {loadMoreLoading ? (
            <div className="mt-3">
              <SearchProgressPanel steps={LOAD_MORE_PROGRESS_STEPS} phases={loadMorePhases} compact />
            </div>
          ) : showLoadMore ? (
            <div className="mt-1 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="inline-flex min-h-[2.75rem] min-w-[10.5rem] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
                disabled={searchLoading || loadMoreLoading || !homeReady}
              >
                <LightningIcon className="h-4 w-4 shrink-0 text-emerald-100" />
                <span className="tabular-nums">{searchCost}</span>
                <span className="text-emerald-100">·</span>
                <span>Показать еще</span>
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
