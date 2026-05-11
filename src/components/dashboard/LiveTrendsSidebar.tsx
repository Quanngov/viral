"use client";

import { useEffect, useState } from "react";
import type { GridVideo, LiveTrendVideo } from "@/lib/mock-data";
import { LiveTrendItem } from "./LiveTrendItem";

type LiveTrendsSidebarProps = {
  onVideoClick?: (video: GridVideo) => void;
};

export function LiveTrendsSidebar({ onVideoClick }: LiveTrendsSidebarProps) {
  const [videos, setVideos] = useState<LiveTrendVideo[]>([]);
  const [videoMap, setVideoMap] = useState<Record<string, GridVideo>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const [trendingRes, homeRes] = await Promise.all([
          fetch("/api/videos/trending?limit=10"),
          fetch("/api/videos/home?limit=50"),
        ]);
        const trendingData = (await trendingRes.json()) as { videos?: LiveTrendVideo[] };
        const homeData = (await homeRes.json()) as { videos?: GridVideo[] };
        if (!cancel) {
          const trend = Array.isArray(trendingData.videos) ? trendingData.videos : [];
          const home = Array.isArray(homeData.videos) ? homeData.videos : [];
          setVideos(trend);
          const map: Record<string, GridVideo> = {};
          for (const v of home) map[v.id] = v;
          setVideoMap(map);
        }
      } catch {
        if (!cancel) setVideos([]);
      } finally {
        if (!cancel) setLoaded(true);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-transparent">
      <header className="shrink-0 px-4 pb-2 pt-4">
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
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-0.5">
        {!loaded ? (
          <p className="px-2 py-6 text-center text-[11px] text-zinc-400">Загрузка…</p>
        ) : videos.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-zinc-500">
            В базе пока нет роликов для ленты. Выполните поиск Shorts.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 px-1">
            {videos.map((video) => (
              <li key={video.id}>
                <LiveTrendItem
                  video={video}
                  onClick={() => {
                    const mapped = videoMap[video.id];
                    if (mapped) {
                      onVideoClick?.(mapped);
                      return;
                    }
                    onVideoClick?.({
                      id: video.id,
                      title: video.title,
                      channel: "—",
                      views: video.views,
                      likes: "—",
                      publishedAt: "—",
                      viralScore: 0,
                      rating: 1,
                      viralLabel: "Stable",
                      thumbnailUrl: video.thumbnailUrl,
                    });
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
