"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  type CompetitorAccount,
  type CompetitorVideo,
} from "@/lib/competitor-mock-data";
import { detectCompetitorPlatform } from "@/lib/competitor-input";

type CompetitorMode = "latest" | "all";
type SortField = "account" | "views" | "likes" | "comments" | "score";
type SortDirection = "asc" | "desc";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDateShort(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}

function scoreCellStyle(score: number): string {
  if (score >= 90) return "bg-emerald-600 text-white";
  if (score >= 70) return "bg-emerald-100 text-emerald-900";
  if (score >= 40) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

function platformBadge(platform: CompetitorAccount["platform"] | CompetitorVideo["platform"]) {
  if (platform === "youtube") return "YT";
  if (platform === "tiktok") return "TT";
  return "IG";
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

export function CompetitorSpySection() {
  const [competitors, setCompetitors] = useState<CompetitorAccount[]>([]);
  const [videos, setVideos] = useState<CompetitorVideo[]>([]);
  const [competitorMode, setCompetitorMode] = useState<CompetitorMode>("latest");
  const [sortField, setSortField] = useState<SortField>("views");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const competitorsById = useMemo(() => {
    const map = new Map<string, CompetitorAccount>();
    for (const competitor of competitors) map.set(competitor.id, competitor);
    return map;
  }, [competitors]);

  const latestVideos = useMemo(() => {
    return [...videos]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 8);
  }, [videos]);

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
        setVideos(Array.isArray(videosData.videos) ? videosData.videos : []);
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
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: competitorInput.trim(),
          platform: detected.platform,
          displayName: detected.username,
          description: "replace with TikHub ingestion later",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error === "already_exists") {
          setFormError("Этот аккаунт уже добавлен.");
          return;
        }
        setFormError("Не удалось добавить конкурента.");
        return;
      }
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
        setVideos(Array.isArray(videosData.videos) ? videosData.videos : []);
      } catch {
        // keep optimistic UI from previous state
      }
    } catch {
      setFormError("Не удалось добавить конкурента.");
    }
  }

  return (
    <section className="px-6 pt-5">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Шпион конкурентов</h1>

      <div className="scrollbar-hide mt-4 flex items-start gap-3 overflow-x-auto overflow-y-visible pb-3 pt-2">
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
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

        {competitors.map((competitor) => (
          <a
            key={competitor.id}
            href={competitor.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="group shrink-0"
          >
            <span className="relative block h-16 w-16 overflow-visible">
              <span className="block h-16 w-16 overflow-hidden rounded-full border border-zinc-200 bg-white ring-2 ring-emerald-200/70">
                <Avatar account={competitor} />
              </span>
              <span className="absolute -bottom-1 left-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-zinc-200 bg-white px-1 text-[10px] font-semibold text-zinc-700 shadow-sm">
                {platformBadge(competitor.platform)}
              </span>
            </span>
            <span className="mt-1.5 block w-16 truncate text-center text-xs font-medium text-zinc-700">
              {competitor.username}
            </span>
          </a>
        ))}
      </div>

      <div className="mt-4 flex w-full rounded-2xl bg-white p-1.5 shadow-sm shadow-zinc-900/5 transition-all duration-300 ease-out">
        <button
          type="button"
          onClick={() => setCompetitorMode("latest")}
          className={`w-1/2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out ${
            competitorMode === "latest"
              ? "bg-emerald-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          Последние видео
        </button>
        <button
          type="button"
          onClick={() => setCompetitorMode("all")}
          className={`w-1/2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out ${
            competitorMode === "all"
              ? "bg-emerald-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          Список всех видео
        </button>
      </div>

      {competitorMode === "latest" ? (
        <div
          className={`mt-4 transition-all duration-300 ease-out ${
            competitorMode === "latest" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          {loading ? null : latestVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500 shadow-sm">
              {competitors.length > 0
                ? "Пока нет роликов конкурентов. Для Instagram загрузка появится после подключения TikHub."
                : "Добавьте конкурентов, чтобы увидеть их последние ролики."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {latestVideos.map((video) => {
                const account = competitorsById.get(video.competitorId);
                return (
                  <article key={video.id}>
                    <div className="relative aspect-[3/4] w-full">
                      <Image
                        src={video.thumbnailUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 100vw"
                        className="h-full w-full object-cover"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <span
                        className={`pointer-events-none absolute right-2.5 top-2.5 flex min-w-[1.9rem] items-center justify-center rounded-lg border px-1.5 py-0.5 text-sm font-semibold tabular-nums shadow-md ${scoreCellStyle(video.score)}`}
                      >
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
                  {[
                    ["account", "Аккаунт", "text"],
                    ["views", "eye", "icon"],
                    ["score", "score", "icon"],
                    ["likes", "heart", "icon"],
                    ["comments", "comment", "icon"],
                  ].map(([field, label]) => {
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
                  <th className="px-4 py-3 text-left font-medium">Сохранить</th>
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
                ) : allVideos.map((video) => {
                  const account = competitorsById.get(video.competitorId);
                  return (
                    <tr key={video.id} className="border-t border-zinc-100 text-zinc-700 hover:bg-zinc-50/80">
                      <td className="px-3 py-3">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-200 bg-white px-1 text-[10px] font-semibold text-zinc-700">
                          {platformBadge(video.platform)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">@{account?.username ?? "unknown"}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(video.views)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${scoreCellStyle(video.score)}`}>
                          {video.score}
                        </span>
                      </td>
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
                          onClick={() => console.log("save", video.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-800"
                          aria-label="Сохранить ролик"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5A1.5 1.5 0 0 1 20.25 6v14.25L12 16.5l-8.25 3.75V6a1.5 1.5 0 0 1 1.5-1.5Z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => console.log("adapt", video.id)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          Адаптировать
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                onClick={onAddCompetitor}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
              >
                <span className="tabular-nums">10</span>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Добавить</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
