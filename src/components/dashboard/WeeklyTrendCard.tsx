import type { WeeklyTrend } from "@/lib/mock-data";

type WeeklyTrendCardProps = {
  trend: WeeklyTrend;
};

export function WeeklyTrendCard({ trend }: WeeklyTrendCardProps) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm shadow-zinc-900/5 transition-all duration-200 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-900/5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400/15 to-transparent blur-2xl opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex flex-1 flex-col">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            {trend.category}
          </span>
          <span className="text-[11px] font-medium text-emerald-700">
            {trend.videoCount} роликов
          </span>
        </div>
        <h3 className="text-[13px] font-semibold leading-snug tracking-tight text-zinc-900 transition-colors group-hover:text-emerald-900">
          {trend.title}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-zinc-500">
          {trend.description}
        </p>
      </div>
    </article>
  );
}
