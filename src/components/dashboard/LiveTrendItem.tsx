import Image from "next/image";
import type { LiveTrendVideo } from "@/lib/mock-data";

type LiveTrendItemProps = {
  video: LiveTrendVideo;
  onClick?: () => void;
};

export function LiveTrendItem({ video, onClick }: LiveTrendItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full gap-2 rounded-xl border border-transparent bg-white p-2 text-left shadow-sm shadow-zinc-900/5 transition-all duration-200 hover:border-emerald-200/80 hover:shadow-md hover:shadow-zinc-900/10"
    >
      <div className="relative h-14 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-900/5">
        <Image
          src={video.thumbnailUrl}
          alt=""
          fill
          sizes="36px"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h3 className="line-clamp-2 flex-1 text-[13px] font-medium leading-snug tracking-tight text-zinc-800 transition-colors group-hover:text-emerald-800">
          {video.title}
        </h3>
        <span className="shrink-0 self-center tabular-nums text-[11px] font-semibold text-zinc-600">
          {video.views}
        </span>
      </div>
    </button>
  );
}
