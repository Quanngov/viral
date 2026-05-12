"use client";

import type { GridVideo } from "@/lib/mock-data";
import type { SaveVideoSourceType } from "@/lib/saved-video-mapper";
import { useSavedVideos } from "@/components/dashboard/SavedVideosContext";

function BookmarkGlyph({ active, className = "h-5 w-5" }: { active: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.85}
      aria-hidden
    >
      <path strokeLinejoin="round" d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v15.75L12 17.25l-7.5 4.5V6A1.5 1.5 0 0 1 6 4.5Z" />
    </svg>
  );
}

type SaveBookmarkButtonProps = {
  video: GridVideo;
  sourceType: SaveVideoSourceType;
  sourceId?: string | null;
  className?: string;
  iconClassName?: string;
  /** «detail» — кнопка с подписью для модалки ролика. */
  variant?: "icon" | "detail";
};

export function SaveBookmarkButton({
  video,
  sourceType,
  sourceId,
  className,
  iconClassName,
  variant = "icon",
}: SaveBookmarkButtonProps) {
  const { isSaved, toggle, busyClientId } = useSavedVideos();
  const saved = isSaved(video.id);
  const busy = busyClientId === video.id;
  const detail = variant === "detail";

  const baseIcon = detail
    ? saved
      ? "inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      : "inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    : saved
      ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-colors disabled:opacity-50 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      : "inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-colors disabled:opacity-50 border-zinc-200/90 bg-white/95 text-zinc-600 backdrop-blur-sm hover:border-emerald-400 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";

  const merged = className ? `${baseIcon} ${className}` : baseIcon;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        void toggle(video, { sourceType, sourceId });
      }}
      className={merged}
      aria-label={saved ? "Убрать из сохранённых" : "Сохранить ролик"}
    >
      <BookmarkGlyph active={saved} className={detail ? "h-5 w-5 shrink-0" : iconClassName ?? "h-5 w-5"} />
      {detail ? <span className="truncate">{saved ? "Сохранено" : "Сохранить"}</span> : null}
    </button>
  );
}
