"use client";

import { useEffect, useState } from "react";
import type { LiveTrendVideo } from "@/lib/mock-data";
import { LiveTrendItem } from "./LiveTrendItem";

export function LiveTrendsSidebar() {
  const [videos, setVideos] = useState<LiveTrendVideo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const res = await fetch("/api/videos/trending?limit=10");
        const data = (await res.json()) as { videos?: LiveTrendVideo[] };
        if (!cancel) setVideos(Array.isArray(data.videos) ? data.videos : []);
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
    <section className="flex min-h-0 flex-1 flex-col border-b border-zinc-200/70 bg-white">
      <header className="shrink-0 px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <span
            className="relative flex h-2 w-2 items-center justify-center"
            aria-hidden
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
          </span>
          <h2 className="text-xs font-semibold tracking-tight text-zinc-900">
            Тренды в реальном времени
          </h2>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-0.5">
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
                <LiveTrendItem video={video} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
