"use client";

import { useState } from "react";
import type { GridVideo } from "@/lib/mock-data";
import { VideoCard } from "./VideoCard";
import { VideoDetailPanel } from "./VideoDetailPanel";

type VideoGridProps = {
  videos: GridVideo[];
  loading?: boolean;
};

function GridSkeleton() {
  return (
    <div className="aspect-[3/4] w-full animate-pulse rounded-2xl bg-zinc-200/90 shadow-sm ring-1 ring-zinc-900/5" />
  );
}

export function VideoGrid({ videos, loading }: VideoGridProps) {
  const [active, setActive] = useState<GridVideo | null>(null);

  return (
    <>
      <section className="pb-8 pt-1">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <GridSkeleton key={i} />)
            : videos.map((video) => (
                <VideoCard key={video.id} video={video} onOpen={() => setActive(video)} />
              ))}
        </div>
      </section>
      <VideoDetailPanel video={active} onClose={() => setActive(null)} />
    </>
  );
}
