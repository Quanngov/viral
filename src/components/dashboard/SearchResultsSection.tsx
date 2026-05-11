"use client";

import { useCallback, useEffect, useState } from "react";
import type { GridVideo } from "@/lib/mock-data";
import type { ApiSort } from "@/lib/search-query";
import { uiLocaleToApi, uiPeriodToApi } from "@/lib/search-query";
import { SearchToolbar } from "@/components/dashboard/SearchToolbar";
import type { SearchFiltersPayload } from "@/components/dashboard/SearchToolbar";
import { VideoGrid } from "@/components/dashboard/VideoGrid";

type SearchResultsSectionProps = {
  searchCost: number;
  onVideoClick?: (video: GridVideo) => void;
};

export function SearchResultsSection({ searchCost, onVideoClick }: SearchResultsSectionProps) {
  const [sourceVideos, setSourceVideos] = useState<GridVideo[]>([]);
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [boot, setBoot] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchSource, setSearchSource] = useState<"cache" | "youtube" | null>(null);
  const [filters, setFilters] = useState<{
    languageMode: "world" | "ru" | "en";
    sort: ApiSort;
    period: "today" | "yesterday" | "week" | "month" | "year" | "all";
    minViews: 0 | 1000 | 10000 | 50000 | 100000 | 1000000;
  }>({
    languageMode: "world",
    sort: "viral_desc",
    period: "week",
    minViews: 0,
  });

  function parseViews(views: string): number {
    const s = views.trim().toUpperCase().replaceAll(" ", "").replaceAll(",", ".");
    const m = s.match(/^([\d.]+)([KMBКМ]?)$/);
    if (!m) {
      const n = Number(s.replace(/[^\d]/g, ""));
      return Number.isFinite(n) ? n : 0;
    }
    const value = Number(m[1]);
    if (!Number.isFinite(value)) return 0;
    const suffix = m[2];
    if (suffix === "K" || suffix === "К") return Math.round(value * 1_000);
    if (suffix === "M" || suffix === "М") return Math.round(value * 1_000_000);
    if (suffix === "B") return Math.round(value * 1_000_000_000);
    return Math.round(value);
  }

  function getPublishedDate(v: GridVideo): Date | null {
    if (v.publishedAtIso) {
      const d = new Date(v.publishedAtIso);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  }

  function isWithinPeriod(videoDate: Date | null, period: typeof filters.period): boolean {
    if (period === "all" || !videoDate) return true;
    const now = new Date();
    const msDiff = now.getTime() - videoDate.getTime();
    switch (period) {
      case "today":
        return now.toDateString() === videoDate.toDateString();
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return y.toDateString() === videoDate.toDateString();
      }
      case "week":
        return msDiff <= 7 * 24 * 3600 * 1000;
      case "month":
        return msDiff <= 30 * 24 * 3600 * 1000;
      case "year":
        return msDiff <= 365 * 24 * 3600 * 1000;
      default:
        return true;
    }
  }

  function hasCyrillic(s: string): boolean {
    return /[А-Яа-яЁё]/.test(s);
  }

  function applyVideoFilters(
    inputVideos: GridVideo[],
    active: typeof filters,
  ): GridVideo[] {
    const list = [...inputVideos];
    const filtered = list.filter((v) => {
      const views = parseViews(v.views);
      if (views < active.minViews) return false;

      if (!isWithinPeriod(getPublishedDate(v), active.period)) return false;

      if (active.languageMode !== "world") {
        const lang = (v.language ?? "").toLowerCase();
        const region = (v.region ?? "").toUpperCase();
        const text = `${v.title} ${v.description ?? ""} ${v.summary ?? ""} ${v.channel}`.trim();
        const cyr = hasCyrillic(text);
        if (active.languageMode === "ru") {
          if (lang || region) {
            if (!(lang === "ru" || region === "RU")) return false;
          } else if (!cyr) {
            return false;
          }
        } else if (active.languageMode === "en") {
          if (lang || region) {
            if (!(lang === "en" || region === "US")) return false;
          } else if (cyr) {
            return false;
          }
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      const av = parseViews(a.views);
      const bv = parseViews(b.views);
      const ad = getPublishedDate(a)?.getTime() ?? 0;
      const bd = getPublishedDate(b)?.getTime() ?? 0;
      const as = a.score ?? null;
      const bs = b.score ?? null;
      const aviral = a.viralScore ?? 0;
      const bviral = b.viralScore ?? 0;

      switch (active.sort) {
        case "views_desc":
          return bv - av;
        case "views_asc":
          return av - bv;
        case "date_desc":
          return bd - ad;
        case "date_asc":
          return ad - bd;
        case "viral_desc":
          if (as != null && bs != null) return bs - as;
          return bviral - aviral;
        case "viral_asc":
          if (as != null && bs != null) return as - bs;
          return aviral - bviral;
        default:
          return 0;
      }
    });

    return filtered;
  }

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function scoreValue(v: GridVideo): number {
    return typeof v.score === "number" ? v.score : 0;
  }

  function buildDisplayOrder(inputVideos: GridVideo[]): GridVideo[] {
    if (inputVideos.length <= 1) return inputVideos;
    const byScore = new Map<number, GridVideo[]>();
    for (const v of inputVideos) {
      const s = scoreValue(v);
      const bucket = byScore.get(s);
      if (bucket) bucket.push(v);
      else byScore.set(s, [v]);
    }
    const orderedScores = Array.from(byScore.keys()).sort((a, b) => b - a);
    const out: GridVideo[] = [];
    for (const s of orderedScores) {
      out.push(...shuffle(byScore.get(s) ?? []));
    }
    return out;
  }

  useEffect(() => {
    let cancel = false;
    async function loadHome() {
      try {
        const res = await fetch("/api/videos/home?limit=50");
        const data = (await res.json()) as {
          videos?: GridVideo[];
          totalCount?: number;
        };
        if (!cancel) {
          setSourceVideos(Array.isArray(data.videos) ? data.videos : []);
          setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0);
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

  async function runSearch(payload: {
    q: string;
    locale: string;
    period: string;
    sort: ApiSort;
    minViews: number;
  }) {
    const q = payload.q.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const { region, language } = uiLocaleToApi(payload.locale);
      const period = uiPeriodToApi(payload.period);

      const params = new URLSearchParams({
        q,
        region: region ?? "",
        language: language ?? "",
        sort: payload.sort,
        period,
        minViews: String(payload.minViews),
      });

      const res = await fetch(`/api/youtube/search?${params.toString()}`);
      const data = (await res.json()) as {
        source?: string;
        videos?: GridVideo[];
        totalCount?: number;
        foundCount?: number;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.message || data.error || `Ошибка ${res.status}`);
      }

      setSearchSource(data.source === "cache" ? "cache" : data.source === "youtube" ? "youtube" : null);
      setSourceVideos(Array.isArray(data.videos) ? data.videos : []);
      if (typeof data.totalCount === "number") setTotalCount(data.totalCount);
    } catch (e) {
      setSearchSource(null);
      setError(e instanceof Error ? e.message : "Не удалось выполнить поиск");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const filtered = applyVideoFilters(sourceVideos, filters);
    setVideos(buildDisplayOrder(filtered));
    setVisibleCount(8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceVideos, filters]);

  const onFiltersChange = useCallback((payload: SearchFiltersPayload) => {
    const period = uiPeriodToApi(payload.period);
    const languageMode =
      payload.locale === "Русский"
        ? "ru"
        : payload.locale === "Английский"
          ? "en"
          : "world";
    const nextMinViews = payload.minViews as 0 | 1000 | 10000 | 50000 | 100000 | 1000000;
    setFilters((prev) => {
      if (
        prev.languageMode === languageMode &&
        prev.sort === payload.sort &&
        prev.period === period &&
        prev.minViews === nextMinViews
      ) {
        return prev;
      }
      return {
        languageMode,
        sort: payload.sort,
        period,
        minViews: nextMinViews,
      };
    });
  }, []);

  const busy = loading || boot;
  const displayedVideos = videos.slice(0, visibleCount);

  const statsParts: string[] = [];
  if (totalCount !== null) {
    statsParts.push(`В базе: ${totalCount} роликов`);
    statsParts.push(`Показано: ${videos.length} из ${sourceVideos.length}`);
    if (searchSource === "cache") statsParts.push("из кэша");
    else if (searchSource === "youtube") statsParts.push("обновлено сейчас");
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

      {!boot && statsParts.length > 0 ? (
        <p className="text-xs text-zinc-600">
          {statsParts.slice(0, 2).join(" • ")}
          {statsParts[2] ? ` • ${statsParts[2]}` : ""}
        </p>
      ) : null}

      {!busy && videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm">
          В базе пока нет роликов. Выполните первый поиск.
        </div>
      ) : (
        <>
          <VideoGrid videos={displayedVideos} loading={busy} onVideoClick={onVideoClick} />
          {!busy && videos.length > visibleCount ? (
            <div className="mt-1 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + 8)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
              >
                <span className="tabular-nums">5</span>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Загрузить еще</span>
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
