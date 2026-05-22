"use client";

import { useEffect, useRef } from "react";
import type { GridVideo } from "@/lib/mock-data";
import { VideoCard } from "./VideoCard";

type VideoGridProps = {
  videos: GridVideo[];
  onVideoClick?: (video: GridVideo) => void;
  cardVariant?: "compact" | "detailed";
};

const PRIORITY_ABOVE_FOLD = 8;

export function VideoGrid({ videos, onVideoClick, cardVariant = "compact" }: VideoGridProps) {
  const baselineCountRef = useRef(videos.length);

  useEffect(() => {
    baselineCountRef.current = videos.length;
  }, [videos.length]);

  const baseline = baselineCountRef.current;

  return (
    <section className="pb-8 pt-1">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {videos.map((video, index) => {
          const isAppended = index >= baseline;
          const delay = isAppended ? Math.min(index - baseline, 8) * 40 : 0;

          return (
            <div
              key={video.id}
              className={isAppended ? "video-card-enter min-w-0" : "min-w-0"}
              style={isAppended ? { animationDelay: `${delay}ms` } : undefined}
            >
              <VideoCard
                video={video}
                variant={cardVariant}
                priority={index < PRIORITY_ABOVE_FOLD}
                debugFirst={index === 0}
                onOpen={() => onVideoClick?.(video)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
