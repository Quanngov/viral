"use client";

import Image from "next/image";
import type { GridVideo } from "@/lib/mock-data";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";

function ratingStyle(rating: number) {
  if (rating >= 85) return "border-emerald-400/90 bg-emerald-600 text-white shadow-emerald-900/25";
  if (rating >= 65) return "border-emerald-200/90 bg-white/95 text-emerald-900 shadow-zinc-900/10";
  return "border-amber-200/90 bg-amber-500 text-white shadow-amber-900/20";
}

type VideoCardProps = {
  video: GridVideo;
  onOpen: () => void;
};

function cardPlatform(v: GridVideo): "youtube" | "instagram" {
  if (v.platform === "instagram" || v.id.startsWith("instagram:")) return "instagram";
  return "youtube";
}

export function VideoCard({ video, onOpen }: VideoCardProps) {
  const platform = cardPlatform(video);
  const useNativeImg =
    platform === "instagram" ||
    (video.thumbnailUrl?.includes("cdninstagram") ?? false) ||
    (video.thumbnailUrl?.includes("fbcdn.net") ?? false);

  const rating = video.score ?? video.rating;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm shadow-zinc-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[3/4] w-full">
        {useNativeImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-md bg-black/45 p-0.5 shadow-md backdrop-blur-[2px]">
          <PlatformIcon platform={platform} size={18} className="block" />
        </span>
        <span
          className={`pointer-events-none absolute right-2.5 top-2.5 flex min-w-[1.9rem] items-center justify-center rounded-lg border px-1.5 py-0.5 text-sm font-semibold tabular-nums shadow-md backdrop-blur-[2px] transition-transform duration-200 group-hover:scale-[1.02] ${ratingStyle(rating)}`}
          title="Оценка ролика (0–99)"
        >
          {rating}
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 pt-10">
          <span className="text-xs font-semibold tabular-nums text-white drop-shadow-sm">{video.views}</span>
          <span className="shrink-0 text-xs font-semibold text-white/95 drop-shadow-sm">
            {video.ageCompact ?? video.publishedAt}
          </span>
        </div>
      </div>
    </button>
  );
}
