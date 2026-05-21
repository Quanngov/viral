"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { GridVideo } from "@/lib/mock-data";
import { LiveTrendItem } from "./LiveTrendItem";

type TrendVideo = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  views: number;
  platform: string;
  authorUsername?: string;
  authorDisplayName?: string;
  url: string;
  rating: number;
  likes?: number;
  publishedAt?: string;
  viralScore?: number;
};

type TrendItem = {
  id: string;
  video: TrendVideo;
  trendScore: number;
  reason?: string;
  source?: string;
  publishedAt?: string;
  detectedAt: string;
};

type LiveTrendVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  views: string;
  platform: string;
  isNew?: boolean;
};

type LiveTrendsSidebarProps = {
  onVideoClick?: (video: GridVideo) => void;
  variant?: "sidebar" | "mobile-horizontal";
};

const POLLING_INTERVAL = 50000;
const LAZY_REFRESH_SESSION_KEY = "viral_trends_lazy_refresh_v1";

/** One lazy-refresh per tab session (survives Strict Mode remount). */
let lazyRefreshInFlight: Promise<void> | null = null;

function runLazyRefreshOnce(): void {
  if (typeof sessionStorage !== "undefined") {
    const last = sessionStorage.getItem(LAZY_REFRESH_SESSION_KEY);
    if (last && Date.now() - Number(last) < 15 * 60 * 1000) return;
  }
  if (lazyRefreshInFlight) return;

  lazyRefreshInFlight = fetch("/api/trends/lazy-refresh", { method: "POST" })
    .catch((err) => console.warn("Lazy refresh failed:", err))
    .finally(() => {
      lazyRefreshInFlight = null;
      try {
        sessionStorage.setItem(LAZY_REFRESH_SESSION_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }) as Promise<void>;
}

function toGridVideo(video: LiveTrendVideo): GridVideo {
  return {
    id: video.id,
    title: video.title,
    channel: video.platform === "youtube" ? "YouTube" : "Instagram",
    views: video.views,
    likes: "—",
    publishedAt: "—",
    viralScore: 0,
    rating: 1,
    viralLabel: "Rising",
    thumbnailUrl: video.thumbnailUrl,
  };
}

function useIsLargeScreen() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

function useLiveTrends(enabled: boolean) {
  const [trends, setTrends] = useState<LiveTrendVideo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const fetchInFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTrends = useCallback(async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const response = await fetch("/api/trends/realtime?limit=10", {
        signal: ac.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!mountedRef.current || ac.signal.aborted) return;

      if (data.error) {
        throw new Error(data.message || "API error");
      }

      const trendItems = Array.isArray(data.trends) ? data.trends : [];
      const newItems = Array.isArray(data.newItems) ? data.newItems : [];

      const liveTrends: LiveTrendVideo[] = trendItems.map((item: TrendItem, index: number) => {
        const isNew = newItems.some((newItem: { id: string }) => newItem.id === item.id);
        const viewsRaw = item.video?.views;
        const viewsNum =
          typeof viewsRaw === "number"
            ? viewsRaw
            : typeof viewsRaw === "string"
              ? Number(String(viewsRaw).replace(/\s/g, "")) || 0
              : 0;
        return {
          id: item.video.id,
          title: item.video.title,
          thumbnailUrl: item.video.thumbnailUrl || "",
          views: viewsNum.toLocaleString("ru-RU"),
          platform: item.video.platform,
          isNew: isNew && index < 3,
        };
      });

      setTrends(liveTrends);
      setError(false);
      setLoaded(true);
    } catch (err) {
      if (ac.signal.aborted) return;
      console.error("Failed to fetch trends:", err);
      if (!mountedRef.current) return;
      setError(true);
      setLoaded(true);
    } finally {
      fetchInFlightRef.current = false;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (document.hidden) return;
      fetchTrends();
    }, POLLING_INTERVAL);
  }, [fetchTrends]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchTrends();
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, fetchTrends, startPolling, stopPolling]);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    runLazyRefreshOnce();
    void fetchTrends();

    if (!document.hidden) {
      startPolling();
    }

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      stopPolling();
    };
  }, [enabled, fetchTrends, startPolling, stopPolling]);

  return { trends, loaded, error };
}

function TrendsHeader() {
  return (
    <header className="shrink-0 px-4 pb-2 pt-3 lg:px-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
        </span>
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">Тренды в реальном времени</h2>
      </div>
    </header>
  );
}

function TrendsStatus({ loaded, error, empty }: { loaded: boolean; error: boolean; empty: boolean }) {
  if (!loaded) {
    return <p className="px-2 py-4 text-center text-[11px] text-zinc-400">Загрузка…</p>;
  }
  if (error) {
    return (
      <p className="px-2 py-4 text-center text-[11px] leading-relaxed text-zinc-500">
        Не удалось загрузить тренды
      </p>
    );
  }
  if (empty) {
    return (
      <p className="px-2 py-4 text-center text-[11px] leading-relaxed text-zinc-500">
        В базе пока нет роликов для ленты. Выполните поиск Shorts.
      </p>
    );
  }
  return null;
}

function MobileTrendCard({
  video,
  onClick,
}: {
  video: LiveTrendVideo;
  onClick: () => void;
}) {
  return (
    <li className="relative w-[min(260px,75vw)] shrink-0 snap-start">
      <button
        type="button"
        onClick={onClick}
        className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm shadow-zinc-900/5"
      >
        <div className="relative aspect-[4/5] w-full bg-zinc-100">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt="" fill sizes="260px" className="object-cover" />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-900">{video.title}</h3>
          <p className="text-[11px] font-semibold tabular-nums text-zinc-600">{video.views}</p>
        </div>
      </button>
      {video.isNew ? (
        <div className="absolute right-1 top-1 z-10 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-md">
          Новый
        </div>
      ) : null}
    </li>
  );
}

export function LiveTrendsSidebar({ onVideoClick, variant = "sidebar" }: LiveTrendsSidebarProps) {
  const isLg = useIsLargeScreen();
  const isMobileHorizontal = variant === "mobile-horizontal";
  const shouldFetch = isMobileHorizontal ? !isLg : isLg;
  const { trends, loaded, error } = useLiveTrends(shouldFetch);

  if (isMobileHorizontal) {
    if (isLg) return null;
    return (
      <section className="block border-b border-zinc-200/80 bg-white px-3 pb-3 pt-2 lg:hidden">
        <header className="pb-2 pt-1">
          <div className="flex items-center gap-2 px-1">
            <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
            </span>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">Тренды в реальном времени</h2>
          </div>
        </header>
        <div className="scrollbar-hidden -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-0.5">
          <TrendsStatus loaded={loaded} error={error} empty={trends.length === 0} />
          {trends.map((video) => (
            <MobileTrendCard
              key={video.id}
              video={video}
              onClick={() => onVideoClick?.(toGridVideo(video))}
            />
          ))}
        </div>
      </section>
    );
  }

  if (!isLg) return null;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl bg-transparent">
      <TrendsHeader />
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-0.5">
        <TrendsStatus loaded={loaded} error={error} empty={trends.length === 0} />
        {trends.length > 0 ? (
          <ul className="flex flex-col gap-2 px-1">
            {trends.map((video) => (
              <li key={video.id} className="relative">
                <LiveTrendItem video={video} onClick={() => onVideoClick?.(toGridVideo(video))} />
                {video.isNew ? (
                  <div className="absolute -right-1 -top-1 z-10 animate-pulse rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-md">
                    Новый
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
