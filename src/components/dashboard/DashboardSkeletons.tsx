"use client";

/** Matches VideoCard shell — same aspect ratio, radius, shadow (no CLS). */
export const SKELETON_CARD_CLASS =
  "aspect-[3/4] w-full shrink-0 rounded-2xl shadow-sm shadow-zinc-900/5 skeleton-breathe skeleton-shimmer";

const BLOCK_CLASS = "skeleton-breathe skeleton-shimmer rounded-md";

export function VideoCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-zinc-900/5"
      aria-hidden
    >
      <div className={SKELETON_CARD_CLASS} />
    </div>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="pb-8 pt-1" aria-busy="true" aria-label="Загрузка роликов">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function TrendRowSkeleton() {
  return (
    <li className="flex w-full gap-2 rounded-xl border border-transparent bg-white p-2 shadow-sm shadow-zinc-900/5">
      <div className={`h-14 w-9 shrink-0 ${BLOCK_CLASS}`} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-0.5">
        <div className={`h-3 w-full ${BLOCK_CLASS}`} />
        <div className={`h-3 w-[72%] ${BLOCK_CLASS}`} />
        <div className={`h-2.5 w-12 self-end ${BLOCK_CLASS}`} />
      </div>
    </li>
  );
}

export function TrendRowSkeletonList({ count = 8 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-2 px-1">
      {Array.from({ length: count }).map((_, i) => (
        <TrendRowSkeleton key={i} />
      ))}
    </ul>
  );
}

export function MobileTrendCardSkeleton() {
  return (
    <li className="relative w-[min(260px,75vw)] shrink-0 snap-start">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
        <div className={`aspect-[4/5] w-full ${BLOCK_CLASS}`} />
        <div className="flex flex-col gap-2 p-2.5">
          <div className={`h-3 w-full ${BLOCK_CLASS}`} />
          <div className={`h-3 w-4/5 ${BLOCK_CLASS}`} />
          <div className={`h-2.5 w-16 ${BLOCK_CLASS}`} />
        </div>
      </div>
    </li>
  );
}
