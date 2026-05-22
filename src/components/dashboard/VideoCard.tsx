"use client";

import { useCallback, useEffect, useState } from "react";
import type { GridVideo } from "@/lib/mock-data";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";

const DEBUG_FIRST =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

function ratingStyle(rating: number) {
  if (rating >= 85) return "border-emerald-400/90 bg-emerald-600 text-white shadow-emerald-900/25";
  if (rating >= 65) return "border-emerald-200/90 bg-white/95 text-emerald-900 shadow-zinc-900/10";
  return "border-amber-200/90 bg-amber-500 text-white shadow-amber-900/20";
}

type VideoCardProps = {
  video: GridVideo;
  onOpen: () => void;
  variant?: "compact" | "detailed";
  priority?: boolean;
  debugFirst?: boolean;
};

function cardPlatform(v: GridVideo): "youtube" | "instagram" | "tiktok" {
  if (v.platform === "tiktok") return "tiktok";
  if (v.platform === "instagram" || v.id.startsWith("instagram:")) return "instagram";
  return "youtube";
}

function resolveThumbSrc(video: GridVideo, platform: string): string | null {
  const extId = video.externalId ?? video.youtubeId ?? null;
  const raw = video.thumbnailUrl?.trim();
  if (raw) return raw;
  if (platform === "youtube" && extId) {
    return `https://i.ytimg.com/vi/${extId}/hqdefault.jpg`;
  }
  return null;
}

export function VideoCard({
  video,
  onOpen,
  variant = "compact",
  priority = false,
  debugFirst = false,
}: VideoCardProps) {
  const platform = cardPlatform(video);
  const thumbSrc = resolveThumbSrc(video, platform);
  const [thumbReady, setThumbReady] = useState(!thumbSrc);
  const [imgFailed, setImgFailed] = useState(false);

  const markReady = useCallback(() => setThumbReady(true), []);

  const onThumbError = useCallback(() => {
    setImgFailed(true);
    setThumbReady(true);
  }, []);

  useEffect(() => {
    if (!thumbSrc) {
      setImgFailed(false);
      setThumbReady(true);
      return;
    }
    let cancelled = false;
    setImgFailed(false);
    setThumbReady(false);

    const probe = new window.Image();
    const done = () => {
      if (!cancelled) markReady();
    };
    const fail = () => {
      if (!cancelled) onThumbError();
    };
    probe.onload = done;
    probe.onerror = fail;
    probe.src = thumbSrc;
    if (probe.complete && probe.naturalWidth > 0) done();

    const fallback = window.setTimeout(done, 900);

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
      window.clearTimeout(fallback);
    };
  }, [video.id, thumbSrc, markReady, onThumbError]);

  const rating = video.score ?? video.rating;
  const detailed = variant === "detailed";
  const showIconFallback = !thumbSrc || imgFailed;
  const isLoading = Boolean(thumbSrc) && !thumbReady && !imgFailed;

  useEffect(() => {
    if (!debugFirst || !DEBUG_FIRST) return;
    console.info("[VideoCard:first]", {
      id: video.id,
      platform,
      title: video.title?.slice(0, 60),
      thumbnailUrl: video.thumbnailUrl,
      resolvedThumb: thumbSrc,
      thumbReady,
      imgFailed,
      isLoading,
      showIconFallback,
      priority,
    });
  }, [
    debugFirst,
    video.id,
    video.title,
    video.thumbnailUrl,
    platform,
    thumbSrc,
    thumbReady,
    imgFailed,
    isLoading,
    showIconFallback,
    priority,
  ]);

  if (!video.title?.trim()) return null;
  if (showIconFallback && !thumbSrc) {
    /* no usable preview — parent filter should drop these; safety */
    if (debugFirst && DEBUG_FIRST) {
      console.warn("[VideoCard:first] skipped — no thumbnail", video.id);
    }
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="dashboard-ease group relative block w-full cursor-pointer overflow-hidden rounded-2xl bg-white text-left shadow-sm shadow-zinc-900/5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-zinc-200/80">
        {thumbSrc && !showIconFallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt=""
            onLoad={markReady}
            onError={onThumbError}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-100 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />
        ) : null}

        {isLoading ? (
          <div className="card-thumb-glass pointer-events-none absolute inset-0 z-[2]" aria-hidden />
        ) : null}

        {showIconFallback ? (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-zinc-100">
            <PlatformIcon platform={platform} size={40} className="opacity-40" />
          </div>
        ) : null}

        {!isLoading ? (
          <div className="pointer-events-none absolute inset-0 z-[3]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            <span className="absolute left-2.5 top-2.5 rounded-md bg-black/50 p-0.5 shadow-md">
              <PlatformIcon platform={platform} size={22} className="block lg:!hidden" />
              <PlatformIcon platform={platform} size={18} className="hidden lg:block" />
            </span>
            <span
              className={`absolute right-2.5 top-2.5 flex min-w-[1.9rem] items-center justify-center rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums shadow-md ${ratingStyle(rating)}`}
              title="Оценка ролика (0–99)"
            >
              {rating}
            </span>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 pt-10">
              <span className="text-[13px] font-semibold tabular-nums text-white drop-shadow-sm sm:text-xs">
                {video.views}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-white/95 drop-shadow-sm sm:text-xs">
                {video.ageCompact ?? video.publishedAt}
              </span>
            </div>
          </div>
        ) : null}
      </div>
      {detailed ? (
        <div className="pointer-events-none min-h-[3.25rem] border-t border-zinc-100 p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">{video.title}</p>
        </div>
      ) : null}
    </button>
  );
}
