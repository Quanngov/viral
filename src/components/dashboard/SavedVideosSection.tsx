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

  if (!isActive) return null;

  return (
    <section className="min-w-0 px-6 pt-5">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Сохраненные ролики</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
        Все ролики, которые вы сохранили для дальнейшей работы
      </p>
      <p className="mt-3 text-sm font-medium text-zinc-700">
        Сохранено: <span className="tabular-nums text-emerald-800">{savedCount}</span>
      </p>

      {loading ? (
        <div className="mt-6">
          <VideoGrid videos={[]} loading onVideoClick={onVideoClick} cardVariant="detailed" />
        </div>
      ) : gridVideos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-6 py-16 text-center shadow-sm shadow-zinc-900/5">
          <p className="text-base font-semibold text-zinc-800">Вы пока не сохранили ни одного ролика</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Сохраняйте ролики из поиска или шпиона, чтобы быстро возвращаться к ним и использовать в сценариях.
          </p>
        </div>
      ) : (
        <div className="mt-6 min-w-0">
          <VideoGrid
            videos={gridVideos}
            loading={false}
            onVideoClick={onVideoClick}
            cardVariant="detailed"
          />
        </div>
      )}
    </section>
  );
}
