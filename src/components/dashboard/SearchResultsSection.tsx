"use client";

import { useEffect, useState } from "react";
import type { GridVideo } from "@/lib/mock-data";
import type { ApiSort } from "@/lib/search-query";
import { uiLocaleToApi, uiPeriodToApi } from "@/lib/search-query";
import { SearchToolbar } from "@/components/dashboard/SearchToolbar";
import { VideoGrid } from "@/components/dashboard/VideoGrid";

type SearchResultsSectionProps = {
  searchCost: number;
};

export function SearchResultsSection({ searchCost }: SearchResultsSectionProps) {
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [boot, setBoot] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [foundAfterSearch, setFoundAfterSearch] = useState<number | null>(null);
  const [searchSource, setSearchSource] = useState<"cache" | "youtube" | null>(null);

  useEffect(() => {
    let cancel = false;
    async function loadHome() {
      try {
        const res = await fetch("/api/videos/home?limit=8");
        const data = (await res.json()) as {
          videos?: GridVideo[];
          totalCount?: number;
        };
        if (!cancel) {
          setVideos(Array.isArray(data.videos) ? data.videos : []);
          setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0);
        }
      } catch {
        if (!cancel) {
          setVideos([]);
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
        period,
        sort: payload.sort,
      });
      if (region) params.set("region", region);
      if (language) params.set("language", language);

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
      setVideos(Array.isArray(data.videos) ? data.videos : []);
      if (typeof data.totalCount === "number") setTotalCount(data.totalCount);
      setFoundAfterSearch(typeof data.foundCount === "number" ? data.foundCount : data.videos?.length ?? 0);
    } catch (e) {
      setSearchSource(null);
      setFoundAfterSearch(null);
      setError(e instanceof Error ? e.message : "Не удалось выполнить поиск");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || boot;

  const statsParts: string[] = [];
  if (totalCount !== null) {
    statsParts.push(`В базе: ${totalCount} роликов`);
    if (foundAfterSearch !== null) {
      const foundLabel = searchSource === "cache" ? "Найдено" : "Найдено по запросу";
      statsParts.push(`${foundLabel}: ${foundAfterSearch}`);
      if (searchSource === "cache") statsParts.push("из кэша");
      else if (searchSource === "youtube") statsParts.push("обновлено сейчас");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchToolbar searchCost={searchCost} searching={loading} onSubmitSearch={runSearch} />

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
        <VideoGrid videos={videos} loading={busy} />
      )}
    </div>
  );
}
