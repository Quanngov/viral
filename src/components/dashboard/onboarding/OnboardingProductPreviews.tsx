"use client";

import { memo, type ReactNode } from "react";
import { FilePenLine } from "lucide-react";
import type { CompetitorAccount, CompetitorVideo } from "@/lib/competitor-mock-data";
import type { GridVideo } from "@/lib/mock-data";
import type { LiveTrendVideo } from "@/lib/trends-display";
import type { OnboardingIntroStep } from "@/lib/onboarding/onboarding-types";
import { LiveTrendItem } from "@/components/dashboard/LiveTrendItem";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { VideoThumbnail } from "@/components/dashboard/VideoThumbnail";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { formatMetricCount } from "@/lib/format-metrics";

type PreviewData = {
  videos: GridVideo[];
  trends: LiveTrendVideo[];
  competitors: CompetitorAccount[];
  competitorVideos: CompetitorVideo[];
};

function PreviewChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-2xl border border-zinc-200 bg-[#f4f5f7] shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-200/90 bg-white px-3 py-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-[10px] font-bold text-white">
          V
        </span>
        <span className="text-[11px] font-semibold text-zinc-700">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function SearchProductPreview({ videos }: { videos: GridVideo[] }) {
  const items = videos.slice(0, 4);
  return (
    <PreviewChrome title="Главная · Поиск">
      <div className="rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 text-xs text-zinc-500">
            идеи для рилс про фитнес
          </div>
          <div className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-2.5 text-xs font-semibold text-white">
            5
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {items.map((video) => (
          <div key={video.id} className="min-w-0 [&_.video-card-enter]:animate-none">
            <VideoCard video={video} variant="compact" priority onOpen={() => {}} />
          </div>
        ))}
      </div>
    </PreviewChrome>
  );
}

function TrendsProductPreview({ trends }: { trends: LiveTrendVideo[] }) {
  const items = trends.slice(0, 4);
  return (
    <PreviewChrome title="Живые тренды">
      <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Сейчас в тренде</p>
        {items.length > 0 ? (
          items.map((t) => <LiveTrendItem key={t.id} video={t} />)
        ) : (
          <p className="px-2 py-4 text-center text-xs text-zinc-500">Загрузка трендов…</p>
        )}
      </div>
    </PreviewChrome>
  );
}

function scoreCellStyle(score: number): string {
  if (score >= 90) return "bg-emerald-600 text-white";
  if (score >= 70) return "bg-emerald-100 text-emerald-900";
  return "bg-amber-100 text-amber-900";
}

function CompetitorsProductPreview({
  competitors,
  videos,
}: {
  competitors: CompetitorAccount[];
  videos: CompetitorVideo[];
}) {
  const account = competitors[0];
  const reels = videos.slice(0, 3);

  return (
    <PreviewChrome title="Шпион конкурентов">
      <p className="text-sm font-semibold text-zinc-900">Шпион конкурентов</p>
      {account ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-rose-100 text-sm font-bold text-zinc-700">
            {(account.username ?? account.displayName ?? "C").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900">
              @{account.username ?? account.displayName}
            </p>
            <p className="text-xs text-zinc-500">{account.displayName}</p>
          </div>
          <PlatformIcon platform={account.platform === "youtube" ? "youtube" : "instagram"} size={18} />
        </div>
      ) : null}
      <div className="mt-2 space-y-1.5">
        {reels.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-white px-2 py-2 shadow-sm"
          >
            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
              <VideoThumbnail
                platform={row.platform}
                externalId={row.externalId}
                thumbnailUrl={row.thumbnailUrl}
                alt=""
                fill
                native
                sizes="40px"
                className="h-full w-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-xs font-medium text-zinc-800">{row.title ?? row.caption ?? "Reel"}</p>
              <p className="text-[10px] text-zinc-500">{formatMetricCount(row.views)} просмотров</p>
            </div>
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${scoreCellStyle(row.score)}`}
            >
              {row.score}
            </span>
          </div>
        ))}
      </div>
    </PreviewChrome>
  );
}

const SAMPLE_SCRIPT = `**Хук (0–3 сек):** Вы теряете клиентов из‑за этой ошибки в Reels.

**Сцена 1:** Покажите проблему крупным планом — зритель должен узнать себя.

**Сцена 2:** Дайте 2–3 конкретных шага, без воды.

**CTA:** Напишите «гайд» в комментарии — пришлю чек-лист.`;

function ScriptsProductPreview({ videos }: { videos: GridVideo[] }) {
  const ref = videos[0];
  const pf = ref?.platform === "instagram" ? "instagram" : ref?.platform === "tiktok" ? "tiktok" : "youtube";

  return (
    <PreviewChrome title="Генерация сценариев">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
        <FilePenLine className="h-4 w-4 text-emerald-700" aria-hidden />
        <p className="text-sm font-semibold text-zinc-900">Генерация сценариев</p>
      </div>
      <div className="mt-2 max-h-[280px] space-y-2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        {ref ? (
          <div className="flex gap-2 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-2.5">
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              <VideoThumbnail
                platform={pf}
                externalId={ref.externalId ?? undefined}
                clientId={ref.id}
                thumbnailUrl={ref.thumbnailUrl}
                alt=""
                fill
                native
                sizes="48px"
                className="h-full w-full"
              />
              <span className="absolute -bottom-0.5 -left-0.5">
                <PlatformIcon platform={pf} size={16} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Референс</p>
              <p className="line-clamp-2 text-xs font-semibold text-zinc-900">{ref.title}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{ref.views} просмотров</p>
            </div>
          </div>
        ) : null}
        <div className="rounded-2xl bg-zinc-50 px-3 py-2.5 text-left">
          <p className="text-[10px] font-semibold text-zinc-500">AI · сценарий</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-zinc-700">
            {SAMPLE_SCRIPT}
          </pre>
        </div>
        <div className="flex gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-400">
          Напишите задачу для сценария…
        </div>
      </div>
    </PreviewChrome>
  );
}

type OnboardingProductPreviewsProps = {
  step: OnboardingIntroStep;
  data: PreviewData;
};

export const OnboardingProductPreviews = memo(function OnboardingProductPreviews({
  step,
  data,
}: OnboardingProductPreviewsProps) {
  switch (step.preview) {
    case "search":
      return <SearchProductPreview videos={data.videos} />;
    case "trends":
      return <TrendsProductPreview trends={data.trends} />;
    case "competitors":
      return (
        <CompetitorsProductPreview competitors={data.competitors} videos={data.competitorVideos} />
      );
    case "scripts":
      return <ScriptsProductPreview videos={data.videos} />;
    default:
      return null;
  }
});
