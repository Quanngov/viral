"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedVideo } from "@prisma/client";
import type { GridVideo } from "@/lib/mock-data";
import { savedVideoToGridVideo } from "@/lib/saved-video-mapper";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { VideoGridSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { useSavedVideos } from "@/components/dashboard/SavedVideosContext";
import { loadSavedVideosList, peekSavedListCache } from "@/lib/dashboard-fetch";

type SavedVideosSectionProps = {
  isActive: boolean;
  onVideoClick: (video: GridVideo) => void;
};

export function SavedVideosSection({ isActive, onVideoClick }: SavedVideosSectionProps) {
  const [rows, setRows] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { savedCount, clearSavedListOptimisticRemovals, isOptimisticallyRemovedFromSavedList } =
    useSavedVideos();

  useEffect(() => {
    let cancelled = false;

    const cached = peekSavedListCache();
    const hasCache = Boolean(cached?.videos?.length);
    if (hasCache) {
      setRows(cached!.videos as SavedVideo[]);
      setLoading(false);
    }

    if (!isActive) return;

    const silent = hasCache;

    async function refresh() {
      if (!silent) setLoading(true);
      try {
        const { data } = await loadSavedVideosList();
        if (cancelled) return;
        setRows(data.videos as SavedVideo[]);
        clearSavedListOptimisticRemovals();
      } catch {
        if (!cancelled && !silent) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, [isActive, savedCount, clearSavedListOptimisticRemovals]);

  const gridVideos = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .map((r) => savedVideoToGridVideo(r))
      .filter((v) => !isOptimisticallyRemovedFromSavedList(v.id))
      .filter((v) => {
        if (seen.has(v.id)) return false;
        seen.add(v.id);
        return true;
      });
  }, [rows, isOptimisticallyRemovedFromSavedList]);

  const showSkeleton = loading && gridVideos.length === 0;

  return (
    <section className="min-w-0 px-6 pt-5">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Сохраненные ролики</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
        Все ролики, которые вы сохранили для дальнейшей работы
      </p>
      <p className="mt-3 text-sm font-medium text-zinc-700">
        Сохранено: <span className="tabular-nums text-emerald-800">{savedCount}</span>
      </p>

      <div className="mt-6">
        {showSkeleton ? (
          <VideoGridSkeleton count={8} />
        ) : gridVideos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-6 py-16 text-center shadow-sm shadow-zinc-900/5">
            <p className="text-base font-semibold text-zinc-800">Вы пока не сохранили ни одного ролика</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Сохраняйте ролики из поиска или шпиона, чтобы быстро возвращаться к ним и использовать в сценариях.
            </p>
          </div>
        ) : (
          <div className="dashboard-fade-in min-w-0">
            <VideoGrid videos={gridVideos} onVideoClick={onVideoClick} cardVariant="detailed" />
          </div>
        )}
      </div>
    </section>
  );
}
