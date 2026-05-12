"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GridVideo } from "@/lib/mock-data";
import type { FeedPlatformMode } from "@/lib/search-query";
import { uiLocaleToApi, uiPeriodToApi } from "@/lib/search-query";
import { SearchToolbar } from "@/components/dashboard/SearchToolbar";
import type { SearchFiltersPayload, SearchSubmitPayload } from "@/components/dashboard/SearchToolbar";
import {
  applyVideoFilters,
  buildDisplayOrder,
  type SearchGridFilters,
} from "@/components/dashboard/search-results-utils";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { useSavedVideos } from "@/components/dashboard/SavedVideosContext";

type SearchResultsSectionProps = {
  searchCost: number;
  onVideoClick?: (video: GridVideo) => void;
};

type FeedSession = {
  q: string;
  platform: FeedPlatformMode;
  locale: string;
};

export function SearchResultsSection({ searchCost, onVideoClick }: SearchResultsSectionProps) {
  const { hydrateForVideos, lastError, clearError } = useSavedVideos();
  const [sourceVideos, setSourceVideos] = useState<GridVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [boot, setBoot] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [, setTokensRemaining] = useState<number | null>(null);
  const [session, setSession] = useState<FeedSession | null>(null);
  const [noMore, setNoMore] = useState(false);
  const feedBatchIndexRef = useRef(1);

  const [filters, setFilters] = useState<SearchGridFilters>({
    languageMode: "world",
    sort: "viral_desc",
    period: "month",
    minViews: 0,
    platformMode: "all",
  });

  const videos = useMemo(() => {
    const filtered = applyVideoFilters(sourceVideos, filters);
    return buildDisplayOrder(filtered);
  }, [sourceVideos, filters]);

  useEffect(() => {
    if (sourceVideos.length === 0) return;
    void hydrateForVideos(sourceVideos);
  }, [sourceVideos, hydrateForVideos]);

  useEffect(() => {
    let cancel = false;
    async function loadHome() {
      try {
        const [homeRes, tokRes] = await Promise.all([
          fetch("/api/videos/home?limit=50"),
          fetch("/api/tokens"),
        ]);
        const data = (await homeRes.json()) as {
          videos?: GridVideo[];
          totalCount?: number;
        };
        const tok = (await tokRes.json()) as { balance?: number };
        if (!cancel) {
          setSourceVideos(Array.isArray(data.videos) ? data.videos : []);
          setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0);
          if (typeof tok.balance === "number") setTokensRemaining(tok.balance);
        }
      } catch {
        if (!cancel) {
          setSourceVideos([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancel) setBoot(false);
      }
    }
    loadHome();
    return () => {
      cancel = true;
    };
  }, []);

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
    };
    return { res, data };
  }

  async function runSearch(payload: SearchSubmitPayload) {
    const q = payload.q.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setNoMore(false);

    try {
      const { region, language } = uiLocaleToApi(payload.locale);
      const period = uiPeriodToApi(payload.period);
      const languageMode = localeToLanguageMode(payload.locale);

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

      if (typeof data.tokensRemaining === "number") setTokensRemaining(data.tokensRemaining);

      if (res.status === 402 || data.tokensOk === false) {
        setError(data.message || "Недостаточно внутренних токенов");
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `Ошибка ${res.status}`);
      }

      setSession({ q, platform: payload.platform, locale: payload.locale });
      feedBatchIndexRef.current = 1;
      setSourceVideos(Array.isArray(data.videos) ? data.videos : []);
      setNoMore(Boolean(data.noMore));
      if (typeof data.totalCount === "number") setTotalCount(data.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить поиск");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!session || loading) return;
    setLoading(true);
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

      if (typeof data.tokensRemaining === "number") setTokensRemaining(data.tokensRemaining);

      if (res.status === 402 || data.tokensOk === false) {
        setError(data.message || "Недостаточно внутренних токенов");
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `Ошибка ${res.status}`);
      }

      const chunk = Array.isArray(data.videos) ? data.videos : [];
      if (chunk.length === 0 && data.noMore) {
        setNoMore(true);
        setError(null);
      } else {
        setSourceVideos((prev) => [...prev, ...chunk]);
        feedBatchIndexRef.current += 1;
        setNoMore(Boolean(data.noMore));
      }
      if (typeof data.totalCount === "number") setTotalCount(data.totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось догрузить ролики");
    } finally {
      setLoading(false);
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

  const busy = loading || boot;
  const displayedVideos = videos;
  const showLoadMore = Boolean(session) && !busy && !noMore;

  const statsParts: string[] = [];
  if (totalCount !== null) {
    statsParts.push(`В базе: ${totalCount} роликов`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-transparent p-4">
      <SearchToolbar
        searchCost={searchCost}
        searching={loading}
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

      {!boot && noMore && session && videos.length === 0 ? (
        <p className="text-sm text-zinc-600">Пока больше роликов нет.</p>
      ) : null}

      {!boot && statsParts.length > 0 ? (
        <p className="text-xs text-zinc-600">{statsParts.join(" • ")}</p>
      ) : null}

      {!busy && videos.length === 0 && !session ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm">
          В базе пока нет роликов. Выполните первый поиск.
        </div>
      ) : (
        <>
          <VideoGrid
            videos={displayedVideos}
            loading={busy}
            onVideoClick={onVideoClick}
          />
          {showLoadMore ? (
            <div className="mt-1 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:opacity-50"
                disabled={loading}
              >
                <LightningIcon className="h-4 w-4 text-emerald-100" />
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
