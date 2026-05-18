"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
};

const POLLING_INTERVAL = 50000; // 50 секунд

export function LiveTrendsSidebar({ onVideoClick }: LiveTrendsSidebarProps) {
  const [trends, setTrends] = useState<LiveTrendVideo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const lazyRefreshCalledRef = useRef(false);

  const fetchTrends = useCallback(async () => {
    try {
      const response = await fetch("/api/trends/realtime?limit=10");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!mountedRef.current) return;

      if (data.error) {
        throw new Error(data.message || "API error");
      }

      const trendItems = Array.isArray(data.trends) ? data.trends : [];
      const newItems = Array.isArray(data.newItems) ? data.newItems : [];

      // Конвертируем в LiveTrendVideo формат
      const liveTrends: LiveTrendVideo[] = trendItems.map((item: TrendItem, index: number) => {
        const isNew = newItems.some((newItem: { id: string }) => newItem.id === item.id);
        return {
          id: item.video.id,
          title: item.video.title,
          thumbnailUrl: item.video.thumbnailUrl || "",
          views: item.video.views.toLocaleString("ru-RU"),
          platform: item.video.platform,
          isNew: isNew && index < 3, // Показываем бейдж только для первых 3
        };
      });

      setTrends(liveTrends);
      setError(false);

      if (!loaded) {
        setLoaded(true);
      }
    } catch (err) {
      console.error("Failed to fetch trends:", err);
      if (!mountedRef.current) return;
      
      setError(true);
      if (!loaded) {
        setLoaded(true);
      }
    }
  }, [loaded]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (document.hidden) {
        return; // Пропускаем polling если вкладка скрыта
      }
      fetchTrends();
    }, POLLING_INTERVAL);
  }, [fetchTrends]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Обработка видимости вкладки
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchTrends(); // Один запрос при возвращении
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchTrends, startPolling, stopPolling]);

  // Основная загрузка при монтировании
  useEffect(() => {
    mountedRef.current = true;

    async function initialLoad() {
      // Сначала запускаем lazy-refresh для заполнения пула
      if (!lazyRefreshCalledRef.current) {
        lazyRefreshCalledRef.current = true;
        try {
          await fetch("/api/trends/lazy-refresh", { method: "POST" });
        } catch (err) {
          console.error("Lazy refresh failed:", err);
        }
      }

      // Затем загружаем тренды (уже должны быть заполнены)
      await fetchTrends();

      // Запускаем polling
      if (mountedRef.current && !document.hidden) {
        startPolling();
      }
    }

    initialLoad();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [fetchTrends, startPolling, stopPolling]);


  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl bg-transparent">
      <header className="shrink-0 px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span
            className="relative flex h-2 w-2 items-center justify-center"
            aria-hidden
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
          </span>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            Тренды в реальном времени
          </h2>
        </div>
      </header>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-0.5">
        {!loaded ? (
          <p className="px-2 py-6 text-center text-[11px] text-zinc-400">Загрузка…</p>
        ) : error ? (
          <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-zinc-500">
            Не удалось загрузить тренды
          </p>
        ) : trends.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-zinc-500">
            В базе пока нет роликов для ленты. Выполните поиск Shorts.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 px-1">
            {trends.map((video) => (
              <li key={video.id} className="relative">
                <LiveTrendItem
                  video={video}
                  onClick={() => {
                    onVideoClick?.({
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
                    });
                  }}
                />
                {video.isNew && (
                  <div className="absolute -right-1 -top-1 z-10 animate-pulse rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-md">
                    Новый
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
