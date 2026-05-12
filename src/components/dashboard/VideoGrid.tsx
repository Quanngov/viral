"use client";

import type { GridVideo } from "@/lib/mock-data";
import { VideoCard } from "./VideoCard";

type VideoGridProps = {
  videos: GridVideo[];
  loading?: boolean;
  onVideoClick?: (video: GridVideo) => void;
  cardVariant?: "compact" | "detailed";
};

function GridSkeleton() {
  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-200/90 shadow-sm ring-1 ring-zinc-900/5 animate-pulse" />
  );
}

export function VideoGrid({ videos, loading, onVideoClick, cardVariant = "compact" }: VideoGridProps) {
  return (
    <section className="pb-8 pt-1">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <GridSkeleton key={i} />)
          : videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                variant={cardVariant}
                onOpen={() => onVideoClick?.(video)}
              />
            ))}
      </div>
    </section>
  );
}
