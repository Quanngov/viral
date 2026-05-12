"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SavedVideo } from "@prisma/client";
import type { GridVideo } from "@/lib/mock-data";
import { savedVideoToGridVideo } from "@/lib/saved-video-mapper";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { useSavedVideos } from "@/components/dashboard/SavedVideosContext";

type SavedVideosSectionProps = {
  isActive: boolean;
  onVideoClick: (video: GridVideo) => void;
};

export function SavedVideosSection({ isActive, onVideoClick }: SavedVideosSectionProps) {
  const [rows, setRows] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const { savedCount, clearSavedListOptimisticRemovals, isOptimisticallyRemovedFromSavedList } = useSavedVideos();
  const loggedOpenRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      loggedOpenRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const log = !loggedOpenRef.current;
      loggedOpenRef.current = true;
      try {
        const q = log ? "?log=1" : "";
        const res = await fetch(`/api/saved-videos${q}`, { cache: "no-store" });
        const data = (await res.json()) as { videos?: SavedVideo[] };
        if (!cancelled) {
          setRows(Array.isArray(data.videos) ? data.videos : []);
          clearSavedListOptimisticRemovals();
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, savedCount, clearSavedListOptimisticRemovals]);

  const gridVideos = useMemo(() => {
    return rows
      .map((r) => savedVideoToGridVideo(r))
      .filter((v) => !isOptimisticallyRemovedFromSavedList(v.id));
  }, [rows, isOptimisticallyRemovedFromSavedList]);

  if (!isActive) return null;

  return (
    <section className="px-6 pt-5">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Сохраненные ролики</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
        Все ролики, которые вы сохранили для дальнейшей работы
      </p>
      <p className="mt-3 text-sm font-medium text-zinc-700">
        Сохранено: <span className="tabular-nums text-emerald-800">{savedCount}</span>
      </p>

      {!loading && gridVideos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-6 py-16 text-center shadow-sm shadow-zinc-900/5">
          <p className="text-base font-semibold text-zinc-800">Пока нет сохраненных роликов</p>
          <p className="mt-2 text-sm text-zinc-600">
            Нажмите на иконку сохранения на карточке ролика, чтобы добавить его сюда.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <VideoGrid
            videos={gridVideos}
            loading={loading}
            onVideoClick={onVideoClick}
            cardVariant="detailed"
          />
        </div>
      )}
    </section>
  );
}
