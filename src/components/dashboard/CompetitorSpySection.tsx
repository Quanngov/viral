"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GridVideo } from "@/lib/mock-data";
import {
  type CompetitorAccount,
  type CompetitorVideo,
} from "@/lib/competitor-mock-data";
import { detectCompetitorPlatform } from "@/lib/competitor-input";
import { videoClientId } from "@/lib/video-client-id";
import { PlatformIcon } from "@/components/dashboard/PlatformIcon";
import { useSavedVideos } from "@/components/dashboard/SavedVideosContext";

type CompetitorMode = "latest" | "all";
type SortField = "account" | "views" | "likes" | "comments" | "score";
type SortDirection = "asc" | "desc";
type CompetitorVideoRow = CompetitorVideo & {
  competitor?: {
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    platform?: string | null;
    profileUrl?: string | null;
  };
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDateShort(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatCompactCount(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function scoreCellStyle(score: number): string {
  if (score >= 90) return "bg-emerald-600 text-white";
  if (score >= 70) return "bg-emerald-100 text-emerald-900";
  if (score >= 40) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

function toKnownPlatform(platform: string | null | undefined): "youtube" | "instagram" | "tiktok" {
  if (platform === "youtube" || platform === "tiktok") return platform;
  return "instagram";
}

function adaptCompetitorVideoToGridVideo(
  video: CompetitorVideoRow,
  account?: CompetitorAccount,
): GridVideo {
  const channelLabel = account?.displayName || account?.username || video.competitor?.displayName || "Competitor";
  const platRaw = video.platform;
  const plat: NonNullable<GridVideo["platform"]> =
    platRaw === "youtube" ? "youtube" : platRaw === "tiktok" ? "tiktok" : "instagram";
  const ext = (video.externalId ?? video.id).trim();
  const id = videoClientId(plat, ext);

  return {
    id,
    platform: plat,
    externalId: ext,
    youtubeId: plat === "youtube" ? ext : null,
    title: video.title ?? video.caption ?? "—",
    channel: channelLabel,
    authorUsername: account?.username ?? video.competitor?.username ?? null,
    authorAvatarUrl: account?.avatarUrl ?? video.competitor?.avatarUrl ?? null,
    description: video.description ?? video.caption ?? "",
    views: formatCompactCount(video.views),
    likes: formatCompactCount(video.likes),
    publishedAt: formatDateShort(video.publishedAt),
    publishedAtIso: video.publishedAt,
    viralScore: video.viralScore ?? 0,
    rating: video.score,
    score: video.score,
    viralLabel: video.score >= 85 ? "High Viral" : video.score >= 65 ? "Rising" : "Stable",
    thumbnailUrl: video.thumbnailUrl ?? "https://picsum.photos/seed/competitor-fallback/540/720",
    url: video.url,
    comments: video.comments,
    viewsPerHour: video.viewsPerHour ?? 0,
    engagementRate: video.engagementRate ?? 0,
    viewsCount: video.views,
    likesCount: video.likes,
    durationSeconds: video.durationSeconds,
    savedFrom: { sourceType: "competitor", sourceId: video.competitorId },
  };
}

function Avatar({ account, size = 64 }: { account: CompetitorAccount; size?: number }) {
  if (account.avatarUrl) {
    return (
      <Image
        src={account.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-zinc-100 text-lg font-semibold uppercase text-emerald-700">
      {account.username[0] ?? "?"}
    </span>
  );
}

type CompetitorSpySectionProps = {
  onVideoClick?: (video: GridVideo) => void;
};

export function CompetitorSpySection({ onVideoClick }: CompetitorSpySectionProps) {
  const [competitors, setCompetitors] = useState<CompetitorAccount[]>([]);
  const [videos, setVideos] = useState<CompetitorVideoRow[]>([]);
  const [competitorMode, setCompetitorMode] = useState<CompetitorMode>("latest");
  const [sortField, setSortField] = useState<SortField>("views");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addNotice, setAddNotice] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  const [disabledLatestIds, setDisabledLatestIds] = useState<Set<string>>(() => new Set());
  const [disabledAllTableIds, setDisabledAllTableIds] = useState<Set<string>>(() => new Set());
  const [accountFilterOpen, setAccountFilterOpen] = useState(false);
  const accountFilterRef = useRef<HTMLDivElement>(null);
  const { hydrateForVideos } = useSavedVideos();

  const competitorsById = useMemo(() => {
    const map = new Map<string, CompetitorAccount>();
    for (const competitor of competitors) map.set(competitor.id, competitor);
    return map;
  }, [competitors]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!accountFilterRef.current?.contains(e.target as Node)) setAccountFilterOpen(false);
    }
    if (accountFilterOpen) document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [accountFilterOpen]);

  const latestVideoPool = useMemo(() => {
    return [...videos]
      .filter((v) => !disabledLatestIds.has(v.competitorId))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [videos, disabledLatestIds]);

  const latestTotalCount = latestVideoPool.length;

  const latestVideos = useMemo(() => {
    return latestVideoPool.slice(0, visibleCount);
  }, [latestVideoPool, visibleCount]);

  const allVideos = useMemo(() => {
    const accountValue = (v: CompetitorVideo) =>
      (competitorsById.get(v.competitorId)?.username ?? "").toLowerCase();
    const numeric = (v: CompetitorVideo) => ({
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      score: v.score,
    });

    return [...videos].sort((a, b) => {
      let cmp = 0;
      if (sortField === "account") {
        cmp = accountValue(a).localeCompare(accountValue(b), "ru");
      } else {
        cmp = numeric(a)[sortField] - numeric(b)[sortField];
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [videos, competitorsById, sortField, sortDirection]);

  const tableVideos = useMemo(() => {
    return allVideos.filter((v) => !disabledAllTableIds.has(v.competitorId));
  }, [allVideos, disabledAllTableIds]);

  useEffect(() => {
    const grids = videos.map((v) => adaptCompetitorVideoToGridVideo(v, competitorsById.get(v.competitorId)));
    void hydrateForVideos(grids);
  }, [videos, competitorsById, hydrateForVideos]);

  function onSort(nextField: SortField) {
    setSortDirection((prev) =>
      sortField === nextField ? (prev === "asc" ? "desc" : "asc") : "desc",
    );
    setSortField(nextField);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/competitors", { cache: "no-store" }),
      fetch("/api/competitors/videos", { cache: "no-store" }),
    ])
      .then(async ([competitorsRes, videosRes]) => {
        const competitorsData = (await competitorsRes.json()) as { competitors?: CompetitorAccount[] };
        const videosData = (await videosRes.json()) as { videos?: CompetitorVideo[] };
        if (cancelled) return;
        setCompetitors(Array.isArray(competitorsData.competitors) ? competitorsData.competitors : []);
        setVideos(Array.isArray(videosData.videos) ? (videosData.videos as CompetitorVideoRow[]) : []);
        setVisibleCount(8);
      })
      .catch(() => {
        if (cancelled) return;
        setCompetitors([]);
        setVideos([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onAddCompetitor() {
    const detected = detectCompetitorPlatform(competitorInput);
    if (!detected.platform || !detected.username) {
      setFormError(
        detected.error ?? "Сейчас можно добавить только YouTube-канал или Instagram-аккаунт",
      );
      return;
    }
    setAddSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: competitorInput.trim(),
          platform: detected.platform,
          displayName: detected.username,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        warning?: string;
        tokensRemaining?: number;
      };
      if (res.status === 402) {
        setFormError(
          data.message ??
            "Недостаточно внутренних токенов для добавления аккаунта. Пополните баланс и попробуйте снова.",
        );
        return;
      }
      if (res.status === 503) {
        setFormError(data.message ?? "Сервис временно недоступен.");
        return;
      }
      if (!res.ok) {
        if (data.error === "already_exists") {
          setFormError("Этот аккаунт уже добавлен.");
          return;
        }
        setFormError(data.message ?? "Не удалось добавить конкурента.");
        return;
      }
      const noticeText =
        data.warning && data.message ? `${data.message} ${data.warning}` : (data.message ?? "Конкурент добавлен.");
      setAddNotice({ text: noticeText, tone: data.warning ? "warn" : "ok" });
      setCompetitorInput("");
      setFormError(null);
      setAddModalOpen(false);
      try {
        const [competitorsRes, videosRes] = await Promise.all([
          fetch("/api/competitors", { cache: "no-store" }),
          fetch("/api/competitors/videos", { cache: "no-store" }),
        ]);
        const competitorsData = (await competitorsRes.json()) as { competitors?: CompetitorAccount[] };
        const videosData = (await videosRes.json()) as { videos?: CompetitorVideo[] };
        setCompetitors(Array.isArray(competitorsData.competitors) ? competitorsData.competitors : []);
        setVideos(Array.isArray(videosData.videos) ? (videosData.videos as CompetitorVideoRow[]) : []);
        setVisibleCount(8);
      } catch {
        // keep optimistic UI from previous state
      }
    } catch {
      setFormError("Не удалось добавить конкурента.");
    } finally {
      setAddSubmitting(false);
    }
  }

  return (
    <section className="px-6 pt-5">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Шпион конкурентов</h1>

      {addNotice ? (
        <div
          className={`mt-3 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            addNotice.tone === "warn"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
          role="status"
        >
          {addNotice.text}
        </div>
      ) : null}

      <div className="scrollbar-hide mt-4 flex items-start gap-3 overflow-x-auto overflow-y-visible pb-3 pt-2">
        <button
          type="button"
          onClick={() => {
            setAddModalOpen(true);
            setFormError(null);
            setAddNotice(null);
          }}
          className="group shrink-0"
          aria-label="Добавить конкурента"
        >
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-emerald-300 bg-emerald-50 text-2xl text-emerald-700 transition-colors group-hover:border-emerald-400 group-hover:bg-emerald-100">
            +
          </span>
          <span className="mt-1.5 block w-16 truncate text-center text-xs font-medium text-zinc-600">
            Добавить
          </span>
        </button>

        {competitors.map((competitor) => {
          const latestOn = !disabledLatestIds.has(competitor.id);
          return (
            <div key={competitor.id} className="flex shrink-0 flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setDisabledLatestIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(competitor.id)) next.delete(competitor.id);
                    else next.add(competitor.id);
                    return next;
                  });
                }}
                className={`group shrink-0 rounded-full outline-none ring-offset-2 transition-[opacity,filter] focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  latestOn ? "opacity-100" : "opacity-45 saturate-50"
                }`}
                aria-pressed={latestOn}
                aria-label={
                  latestOn
                    ? `Отключить ${competitor.username} из последних видео`
                    : `Включить ${competitor.username} в последние видео`
                }
              >
                <span className="relative block h-16 w-16 overflow-visible">
                  <span className="block h-16 w-16 overflow-hidden rounded-full border border-zinc-200 bg-white ring-2 ring-emerald-200/70">
                    <Avatar account={competitor} />
                  </span>
                  <span className="pointer-events-none absolute bottom-0 left-0 flex translate-y-0.5 items-end justify-start drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                    <PlatformIcon platform={toKnownPlatform(competitor.platform)} size={15} />
                  </span>
                </span>
              </button>
              <a
                href={competitor.profileUrl}
                target="_blank"
                rel="noreferrer"
                className={`mt-1.5 block w-16 truncate text-center text-xs font-medium underline-offset-2 hover:underline ${
                  latestOn ? "text-zinc-700" : "text-zinc-400"
                }`}
              >
                {competitor.username}
              </a>
            </div>
          );
        })}
      </div>

      <div className="mt-4 w-full rounded-2xl bg-white p-1.5 shadow-sm shadow-zinc-900/5">
        <div className="relative grid h-12 grid-cols-2 items-center rounded-xl bg-zinc-50">
          <span
            className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-xl bg-emerald-600 shadow-sm transition-all duration-300 ease-out ${
              competitorMode === "latest" ? "left-1 translate-x-0" : "left-1 translate-x-full"
            }`}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => {
              setCompetitorMode("latest");
              setVisibleCount(8);
            }}
            className={`relative z-10 h-full rounded-xl px-4 text-sm font-semibold transition-all duration-300 ease-out ${
              competitorMode === "latest" ? "text-white" : "text-zinc-600"
            }`}
          >
            Последние видео
          </button>
          <button
            type="button"
            onClick={() => setCompetitorMode("all")}
            className={`relative z-10 h-full rounded-xl px-4 text-sm font-semibold transition-all duration-300 ease-out ${
              competitorMode === "all" ? "text-white" : "text-zinc-600"
            }`}
          >
            Список всех видео
          </button>
        </div>
      </div>

      {competitorMode === "latest" ? (
        <div
          className={`mt-4 transition-all duration-300 ease-out ${
            competitorMode === "latest" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          {loading ? null : latestVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500 shadow-sm">
              {competitors.length === 0
                ? "Добавьте конкурентов, чтобы увидеть их последние ролики."
                : videos.length === 0
                  ? "Пока нет роликов конкурентов. Для Instagram загрузка появится после подключения TikHub."
                  : "Все профили отключены для вкладки «Последние видео». Включите хотя бы один кружок выше."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {latestVideos.map((video) => {
                const account = competitorsById.get(video.competitorId);
                return (
                  <article
                    key={video.id}
                    className="group cursor-pointer"
                    onClick={() => onVideoClick?.(adaptCompetitorVideoToGridVideo(video, account))}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-white shadow-sm shadow-zinc-900/5">
                      <Image
                        src={video.thumbnailUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 100vw"
                        className="h-full w-full object-cover object-center"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow-sm">
                        <PlatformIcon platform={toKnownPlatform(video.platform)} size={13} />
                      </span>
                      <span className={`pointer-events-none absolute right-2.5 top-2.5 flex min-w-[1.9rem] items-center justify-center rounded-lg border px-1.5 py-0.5 text-sm font-semibold tabular-nums shadow-md ${scoreCellStyle(video.score)}`}>
                        {video.score}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 pt-10">
                        <span className="text-xs font-semibold tabular-nums text-white drop-shadow-sm">
                          {formatNumber(video.views)}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-white/95 drop-shadow-sm">
                          {formatDateShort(video.publishedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 px-0.5">
                      <span className="h-6 w-6 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
                        {account ? <Avatar account={account} size={24} /> : null}
                      </span>
                      <span className="truncate text-xs font-medium text-zinc-700">
                        @{account?.username ?? "unknown"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {!loading && latestTotalCount > latestVideos.length ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Показать еще
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={`mt-4 overflow-hidden rounded-2xl bg-white shadow-sm shadow-zinc-900/5 transition-all duration-300 ease-out ${
            competitorMode === "all" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="w-12 px-3 py-3 text-left font-medium">
                    <span className="sr-only">Платформа</span>
                  </th>
                  <th className="w-16 px-2 py-3 text-left font-medium">
                    <span className="sr-only">Превью</span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <div ref={accountFilterRef} className="relative inline-flex items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        onClick={() => setAccountFilterOpen((o) => !o)}
                        aria-expanded={accountFilterOpen}
                        aria-haspopup="true"
                      >
                        <span>Аккаунт</span>
                        <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 rounded-md px-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        onClick={() => onSort("account")}
                        aria-label="Сортировать по аккаунту"
                      >
                        <span className={`text-[10px] ${sortField === "account" ? "text-emerald-600" : "text-zinc-400"}`}>
                          {sortField === "account" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                      {accountFilterOpen ? (
                        <div
                          className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded-xl border border-zinc-200 bg-white py-2 shadow-lg shadow-zinc-900/10"
                          role="dialog"
                          aria-label="Фильтр по аккаунтам"
                        >
                          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                            Показывать в таблице
                          </p>
                          <ul className="max-h-56 overflow-y-auto px-1">
                            {competitors.map((c) => {
                              const on = !disabledAllTableIds.has(c.id);
                              return (
                                <li key={c.id}>
                                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50">
                                    <input
                                      type="checkbox"
                                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                      checked={on}
                                      onChange={() => {
                                        setDisabledAllTableIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(c.id)) next.delete(c.id);
                                          else next.add(c.id);
                                          return next;
                                        });
                                      }}
                                    />
                                    <span className="truncate">@{c.username}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </th>
                  {(
                    [
                      ["score", "score", "icon"],
                      ["views", "eye", "icon"],
                      ["likes", "heart", "icon"],
                      ["comments", "comment", "icon"],
                    ] as const
                  ).map(([field, label]) => {
                    const active = sortField === field;
                    return (
                      <th key={field} className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900"
                          onClick={() => onSort(field as SortField)}
                        >
                          {label === "eye" ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          ) : label === "heart" ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.07-4.5-4.625-4.5-1.847 0-3.44 1.059-4.125 2.592-.685-1.533-2.278-2.592-4.125-2.592C5.57 3.75 3.5 5.765 3.5 8.25c0 7.22 8.75 11.25 8.75 11.25S21 15.47 21 8.25Z" />
                            </svg>
                          ) : label === "comment" ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h6m-9.75 8.25h12A2.25 2.25 0 0 0 18 17.25V6.75A2.25 2.25 0 0 0 15.75 4.5h-12A2.25 2.25 0 0 0 1.5 6.75v10.5A2.25 2.25 0 0 0 3.75 19.5Z" />
                            </svg>
                          ) : label === "score" ? (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M12 3.5 14.5 8.6l5.6.8-4 3.9.9 5.6-5-2.7-5 2.7.9-5.6-4-3.9 5.6-.8L12 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <span>{label}</span>
                          )}
                          <span className={`text-[10px] ${active ? "text-emerald-600" : "text-zinc-400"}`}>
                            {active ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-left font-medium">Ссылка</th>
                  <th className="px-4 py-3 text-left font-medium">Адаптировать</th>
                </tr>
              </thead>
              <tbody>
                {loading ? null : allVideos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">
                      Пока нет роликов конкурентов. Добавьте YouTube-канал конкурента.
                    </td>
                  </tr>
                ) : tableVideos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">
                      Для всех аккаунтов в таблице включён фильтр «скрыть». Включите хотя бы один аккаунт в меню «Аккаунт».
                    </td>
                  </tr>
                ) : (
                  tableVideos.map((video) => {
                  const account = competitorsById.get(video.competitorId);
                  return (
                    <tr key={video.id} className="border-t border-zinc-100 text-zinc-700 hover:bg-zinc-50/80">
                      <td className="px-3 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm">
                          <PlatformIcon platform={toKnownPlatform(video.platform)} size={14} />
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="relative h-12 w-9 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
                          {video.thumbnailUrl ? (
                            <Image
                              src={video.thumbnailUrl}
                              alt=""
                              fill
                              sizes="36px"
                              className="h-full w-full object-cover object-center"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-7 w-7 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
                            {account ? <Avatar account={account} size={28} /> : null}
                          </span>
                          <span className="truncate text-sm font-medium">
                            @{account?.username ?? account?.displayName ?? "unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${scoreCellStyle(video.score)}`}>
                          {video.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(video.views)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(video.likes)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(video.comments)}</td>
                      <td className="px-4 py-3">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 transition-colors hover:text-emerald-900"
                        >
                          Открыть
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onVideoClick?.(adaptCompetitorVideoToGridVideo(video, account))}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          Адаптировать
                        </button>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addModalOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
            setAddModalOpen(false);
            setFormError(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-zinc-900/15"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Добавить конкурента</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Добавьте YouTube-канал или Instagram-аккаунт конкурента, чтобы отслеживать его ролики.
            </p>

            <input
              value={competitorInput}
              onChange={(e) => {
                setCompetitorInput(e.target.value);
                setFormError(null);
              }}
              placeholder="Вставьте ссылку на YouTube или Instagram"
              className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-400"
            />

            {formError ? <p className="mt-2 text-xs text-red-600">{formError}</p> : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={addSubmitting}
                onClick={onAddCompetitor}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addSubmitting ? "Добавляем…" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
