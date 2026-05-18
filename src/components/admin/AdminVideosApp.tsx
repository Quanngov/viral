"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AdminEventsConsole } from "@/components/admin/AdminEventsConsole";

export type AdminVideoRow = {
  id: string;
  platform: string;
  externalId: string;
  url: string;
  title: string;
  description: string | null;
  channelId: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  durationSeconds: number;
  publishedAt: string;
  ageHours: number;
  score: number;
  rating: number;
  viralScore: number;
  viewsPerHour: number;
  engagementRate: number;
  sourceQuery: string | null;
  niche: string | null;
  language: string | null;
  region: string | null;
  createdAt: string;
  updatedAt: string;
  lastFetchedAt: string | null;
};

type StatsPayload = {
  totalVideos: number;
  youtubeCount: number;
  instagramCount: number;
  avgScore: number | null;
  maxViews: number;
  lastActivityAt: string | null;
};

type FiltersPayload = {
  platforms: string[];
  niches: string[];
  sourceQueries: string[];
};

const SORTABLE = new Set([
  "views",
  "likes",
  "comments",
  "publishedAt",
  "score",
  "rating",
  "viralScore",
  "viewsPerHour",
  "engagementRate",
  "createdAt",
  "updatedAt",
  "durationSeconds",
]);

function thumbSrc(v: AdminVideoRow): string {
  const t = v.thumbnailUrl?.trim();
  if (t) return t;
  return `https://i.ytimg.com/vi/${v.externalId}/hqdefault.jpg`;
}

function formatDt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AdminVideosInner() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get("key");

  const appendKey = useCallback(
    (pathWithQuery: string) => {
      if (!adminKey) return pathWithQuery;
      const sep = pathWithQuery.includes("?") ? "&" : "?";
      return `${pathWithQuery}${sep}key=${encodeURIComponent(adminKey)}`;
    },
    [adminKey],
  );

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [filters, setFilters] = useState<FiltersPayload | null>(null);
  const [videos, setVideos] = useState<AdminVideoRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);

  const [sortBy, setSortBy] = useState("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [platform, setPlatform] = useState("all");
  const [niche, setNiche] = useState("all");
  const [sourceQuery, setSourceQueryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

  type ApiHealth = {
    tikhub: string;
    youtube: string;
    deepseek: string;
    groq: string;
    database: string;
  };
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);

  const [detail, setDetail] = useState<AdminVideoRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput.trim()), 320);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс пагинации при смене фильтров
    setPage(1);
  }, [debouncedQ, platform, niche, sourceQuery, limit]);

  useEffect(() => {
    let cancel = false;
    async function loadMeta() {
      try {
        const [sr, fr] = await Promise.all([
          fetch(appendKey("/api/admin/stats")),
          fetch(appendKey("/api/admin/video-filters")),
        ]);
        if (!sr.ok || !fr.ok) throw new Error("Не удалось загрузить метаданные");
        const s = (await sr.json()) as StatsPayload;
        const f = (await fr.json()) as FiltersPayload;
        if (!cancel) {
          setStats(s);
          setFilters(f);
          setMetaError(null);
        }
      } catch {
        if (!cancel) setMetaError("Ошибка загрузки статистики или фильтров");
      }
    }
    loadMeta();
    return () => {
      cancel = true;
    };
  }, [appendKey]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(appendKey("/api/admin/health"));
        if (!res.ok) return;
        const h = (await res.json()) as ApiHealth;
        if (!cancel) setApiHealth(h);
      } catch {
        if (!cancel) setApiHealth(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [appendKey]);

  useEffect(() => {
    let cancel = false;
    async function loadVideos() {
      setLoading(true);
      setTableError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sortBy,
          sortOrder,
          q: debouncedQ,
          platform,
          niche,
          sourceQuery,
        });
        const res = await fetch(appendKey(`/api/admin/videos?${params.toString()}`));
        const data = (await res.json()) as {
          videos?: AdminVideoRow[];
          totalCount?: number;
          totalPages?: number;
          error?: string;
          message?: string;
        };
        if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
        if (!cancel) {
          setVideos(Array.isArray(data.videos) ? data.videos : []);
          setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0);
          setTotalPages(Math.max(1, typeof data.totalPages === "number" ? data.totalPages : 1));
        }
      } catch (e) {
        if (!cancel) {
          setVideos([]);
          setTableError(e instanceof Error ? e.message : "Ошибка загрузки таблицы");
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    loadVideos();
    return () => {
      cancel = true;
    };
  }, [appendKey, page, limit, sortBy, sortOrder, debouncedQ, platform, niche, sourceQuery]);

  function handleSort(field: string) {
    if (!SORTABLE.has(field)) return;
    if (sortBy === field) setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }

  const sortArrow = useMemo(
    () => (field: string) => {
      if (sortBy !== field || !SORTABLE.has(field)) return "";
      return sortOrder === "desc" ? "↓" : "↑";
    },
    [sortBy, sortOrder],
  );

  const platformOpts = filters?.platforms?.length
    ? ["all", ...filters.platforms]
    : ["all", "youtube", "instagram"];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Админка · база роликов</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Только чтение из локальной БД. YouTube API не используется.
        </p>
      </header>

      <main className="mx-auto max-w-[1800px] space-y-6 px-8 py-6">
        {apiHealth ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5">
            <h2 className="text-sm font-semibold text-zinc-900">Статус API</h2>
            <p className="mt-1 text-xs text-zinc-500">Только факт наличия ключей в окружении, без значений.</p>
            <ul className="mt-3 grid gap-2 text-sm text-zinc-800 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <li>
                <span className="font-medium">TikHub:</span>{" "}
                {apiHealth.tikhub === "connected" ? "подключен" : "не задан"}
              </li>
              <li>
                <span className="font-medium">YouTube:</span>{" "}
                {apiHealth.youtube === "connected" ? "подключен" : "не задан"}
              </li>
              <li>
                <span className="font-medium">DeepSeek:</span>{" "}
                {apiHealth.deepseek === "connected" ? "подключен" : "не задан"}
              </li>
              <li>
                <span className="font-medium">Groq:</span>{" "}
                {apiHealth.groq === "connected" ? "подключен" : "не задан"}
              </li>
              <li>
                <span className="font-medium">DATABASE_URL:</span>{" "}
                {apiHealth.database === "connected" ? "подключен" : "не задан"}
              </li>
            </ul>
          </section>
        ) : null}

        <TrendsQueueSection />

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Всего роликов" highlight value={stats ? stats.totalVideos : "—"} />
          <StatCard label="YouTube" value={stats ? stats.youtubeCount : "—"} />
          <StatCard label="Instagram" value={stats ? stats.instagramCount : "—"} />
          <StatCard label="Средний score" value={stats?.avgScore != null ? stats.avgScore : "—"} />
          <StatCard label="Макс. просмотров" value={stats ? stats.maxViews.toLocaleString("ru-RU") : "—"} />
          <StatCard label="Последняя активность" value={stats ? formatDt(stats.lastActivityAt) : "—"} small />
        </section>

        {metaError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{metaError}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Поиск</span>
              <input
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Заголовок, описание, канал, запрос, ниша, URL…"
                className="h-10 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 text-sm outline-none ring-emerald-500/15 focus:border-emerald-400 focus:bg-white focus:ring-4"
              />
            </label>
            <FilterSelect label="Платформа" value={platform} onChange={setPlatform}>
              {platformOpts.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "Все" : p}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Ниша" value={niche} onChange={setNiche}>
              <option value="all">Все</option>
              {(filters?.niches ?? []).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Source query" value={sourceQuery} onChange={setSourceQueryFilter} wide>
              <option value="all">Все</option>
              {(filters?.sourceQueries ?? []).map((sq) => (
                <option key={sq} value={sq}>
                  {sq.length > 56 ? `${sq.slice(0, 54)}…` : sq}
                </option>
              ))}
            </FilterSelect>
          </div>
        </section>

        {tableError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{tableError}</p>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1600px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90">
                  <th className="sticky left-0 z-10 bg-zinc-50/95 px-2 py-2.5 font-semibold text-zinc-600">Превью</th>
                  <th className="px-2 py-2.5 font-semibold text-zinc-600">Платформа</th>
                  <th className="max-w-[180px] px-2 py-2.5 font-semibold text-zinc-600">Заголовок</th>
                  <th className="max-w-[120px] px-2 py-2.5 font-semibold text-zinc-600">Канал</th>
                  <th className="px-2 py-2.5 font-semibold text-zinc-600">URL</th>
                  <SortTh label="Просмотры" field="views" sortBy={sortBy} arrow={sortArrow("views")} onSort={handleSort} />
                  <SortTh label="Лайки" field="likes" sortBy={sortBy} arrow={sortArrow("likes")} onSort={handleSort} />
                  <SortTh label="Коммент." field="comments" sortBy={sortBy} arrow={sortArrow("comments")} onSort={handleSort} />
                  <SortTh label="Длит., с" field="durationSeconds" sortBy={sortBy} arrow={sortArrow("durationSeconds")} onSort={handleSort} />
                  <SortTh label="Опубликовано" field="publishedAt" sortBy={sortBy} arrow={sortArrow("publishedAt")} onSort={handleSort} />
                  <th className="px-2 py-2.5 font-semibold text-zinc-600">Возраст (ч)</th>
                  <SortTh label="Score" field="score" sortBy={sortBy} arrow={sortArrow("score")} onSort={handleSort} />
                  <SortTh label="Viral" field="viralScore" sortBy={sortBy} arrow={sortArrow("viralScore")} onSort={handleSort} />
                  <SortTh label="Просм./ч" field="viewsPerHour" sortBy={sortBy} arrow={sortArrow("viewsPerHour")} onSort={handleSort} />
                  <SortTh label="ER" field="engagementRate" sortBy={sortBy} arrow={sortArrow("engagementRate")} onSort={handleSort} />
                  <th className="max-w-[100px] px-2 py-2.5 font-semibold text-zinc-600">Запрос</th>
                  <th className="max-w-[90px] px-2 py-2.5 font-semibold text-zinc-600">Ниша</th>
                  <th className="px-2 py-2.5 font-semibold text-zinc-600">Язык</th>
                  <th className="px-2 py-2.5 font-semibold text-zinc-600">Регион</th>
                  <th className="max-w-[100px] px-2 py-2.5 font-semibold text-zinc-600">YouTube ID</th>
                  <SortTh label="Создано" field="createdAt" sortBy={sortBy} arrow={sortArrow("createdAt")} onSort={handleSort} />
                  <SortTh label="Обновлено" field="updatedAt" sortBy={sortBy} arrow={sortArrow("updatedAt")} onSort={handleSort} />
                  <th className="px-2 py-2.5 font-semibold text-zinc-600">lastFetchedAt</th>
                  <th className="sticky right-0 z-10 bg-zinc-50/95 px-2 py-2.5 font-semibold text-zinc-600">Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={24} className="px-6 py-16 text-center text-sm text-zinc-500">
                      Загрузка…
                    </td>
                  </tr>
                ) : videos.length === 0 ? (
                  <tr>
                    <td colSpan={24} className="px-6 py-16 text-center text-sm text-zinc-500">
                      В базе пока нет роликов
                    </td>
                  </tr>
                ) : (
                  videos.map((v) => (
                    <tr
                      key={v.id}
                      className="cursor-pointer border-b border-zinc-100 hover:bg-emerald-50/50"
                      onClick={() => setDetail(v)}
                    >
                      <td className="sticky left-0 z-[1] bg-white px-2 py-2 hover:bg-emerald-50/50">
                        <div className="relative h-11 w-[62px] overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                          <Image src={thumbSrc(v)} alt="" fill sizes="62px" className="object-cover" />
                        </div>
                      </td>
                      <td className="px-2 py-2 font-medium">{v.platform}</td>
                      <td className="max-w-[180px] truncate px-2 py-2" title={v.title}>
                        {v.title}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2" title={v.channelTitle ?? ""}>
                        {v.channelTitle ?? "—"}
                      </td>
                      <td className="max-w-[72px] truncate px-2 py-2">
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          открыть
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{v.views.toLocaleString("ru-RU")}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{v.likes.toLocaleString("ru-RU")}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{v.comments}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{v.durationSeconds}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-[11px]">{formatDt(v.publishedAt)}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{Number(v.ageHours.toFixed(1))}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{v.score}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{Number(v.viralScore.toFixed(2))}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{Number(v.viewsPerHour.toFixed(1))}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{(v.engagementRate * 100).toFixed(2)}%</td>
                      <td className="max-w-[100px] truncate px-2 py-2" title={v.sourceQuery ?? ""}>
                        {v.sourceQuery ?? "—"}
                      </td>
                      <td className="max-w-[90px] truncate px-2 py-2" title={v.niche ?? ""}>
                        {v.niche ?? "—"}
                      </td>
                      <td className="px-2 py-2">{v.language ?? "—"}</td>
                      <td className="px-2 py-2">{v.region ?? "—"}</td>
                      <td className="max-w-[100px] truncate px-2 py-2 font-mono text-[11px]" title={v.externalId}>
                        {v.externalId}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-[11px]">{formatDt(v.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-[11px]">{formatDt(v.updatedAt)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-[11px]">{formatDt(v.lastFetchedAt)}</td>
                      <td className="sticky right-0 z-[1] bg-white px-2 py-2 hover:bg-emerald-50/50">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail(v);
                          }}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
                        >
                          Подробнее
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
            <p className="text-xs text-zinc-500">
              Страница <span className="font-semibold text-zinc-800">{page}</span> из{" "}
              <span className="font-semibold text-zinc-800">{totalPages}</span>
              <span className="mx-2 text-zinc-300">·</span>
              Всего записей: <span className="font-semibold text-zinc-800">{totalCount}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                На странице
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-emerald-300 disabled:opacity-40"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-emerald-300 disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          </footer>
        </section>
          </div>

          <AdminEventsConsole appendKey={appendKey} />
        </div>
      </main>

      {detail ? <DetailModal video={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${
        highlight ? "border-emerald-200 bg-emerald-50/90 shadow-emerald-900/5" : "border-zinc-200 bg-white shadow-zinc-900/5"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums text-zinc-900 ${small ? "text-xs leading-snug" : "text-lg"} ${highlight ? "text-emerald-900" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${wide ? "min-w-[200px]" : "min-w-[130px]"}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-emerald-400"
      >
        {children}
      </select>
    </label>
  );
}

function SortTh({
  label,
  field,
  sortBy,
  arrow,
  onSort,
}: {
  label: string;
  field: string;
  sortBy: string;
  arrow: string;
  onSort: (f: string) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="whitespace-nowrap px-2 py-2.5 font-semibold text-zinc-600">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-emerald-50 hover:text-emerald-900 ${active ? "text-emerald-800" : ""}`}
      >
        {label}
        <span className="font-normal tabular-nums text-emerald-600">{arrow}</span>
      </button>
    </th>
  );
}

function DetailModal({ video, onClose }: { video: AdminVideoRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-zinc-900/35" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold leading-snug text-zinc-900">{video.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-500 hover:border-emerald-300 hover:text-emerald-800"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-900/5">
            <Image src={thumbSrc(video)} alt="" fill className="object-cover" sizes="480px" />
          </div>
          {video.description ? (
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">{video.description}</p>
          ) : null}

          <dl className="mt-4 space-y-2 text-sm">
            <DetailRow k="Платформа" v={video.platform} />
            <DetailRow k="URL" v={video.url} link />
            <DetailRow k="External ID" v={video.externalId} mono />
            <DetailRow k="channelId" v={video.channelId ?? "—"} mono />
            <DetailRow k="Канал" v={video.channelTitle ?? "—"} />
            <DetailRow k="Опубликовано" v={formatDt(video.publishedAt)} />
            <DetailRow k="Длительность, с" v={String(video.durationSeconds)} />
            <DetailRow k="Просмотры" v={video.views.toLocaleString("ru-RU")} />
            <DetailRow k="Лайки" v={video.likes.toLocaleString("ru-RU")} />
            <DetailRow k="Комментарии" v={String(video.comments)} />
            <DetailRow k="Score" v={String(video.score)} />
            <DetailRow k="Viral score" v={Number(video.viralScore.toFixed(4)).toString()} />
            <DetailRow k="Просм./ч" v={Number(video.viewsPerHour.toFixed(2)).toString()} />
            <DetailRow k="Engagement rate" v={`${(video.engagementRate * 100).toFixed(4)}%`} />
            <DetailRow k="sourceQuery" v={video.sourceQuery ?? "—"} />
            <DetailRow k="niche" v={video.niche ?? "—"} />
            <DetailRow k="language" v={video.language ?? "—"} />
            <DetailRow k="region" v={video.region ?? "—"} />
            <DetailRow k="createdAt" v={formatDt(video.createdAt)} />
            <DetailRow k="updatedAt" v={formatDt(video.updatedAt)} />
            <DetailRow k="lastFetchedAt" v={formatDt(video.lastFetchedAt)} />
          </dl>

          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700"
          >
            Открыть ролик
          </a>
        </div>
      </aside>
    </div>
  );
}

function DetailRow({ k, v, link, mono }: { k: string; v: string; link?: boolean; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[132px_1fr] gap-2 border-b border-zinc-50 py-1.5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{k}</dt>
      <dd className={`text-zinc-800 ${mono ? "break-all font-mono text-xs" : "break-words"}`}>
        {link ? (
          <a href={v} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline-offset-2 hover:underline">
            {v}
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}

type TrendItem = {
  id: string;
  videoId: string;
  status: string;
  trendScore: number;
  reason: string | null;
  source: string | null;
  detectedAt: string;
  releaseAt: string | null;
  publishedAt: string | null;
  video: {
    title: string;
    platform: string;
    authorUsername: string | null;
    views: number;
    rating: number;
    publishedAt: string;
  };
};

function TrendsQueueSection() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function loadTrends() {
      try {
        const response = await fetch("/api/admin/trends");
        const data = await response.json();
        if (Array.isArray(data.trends)) {
          setTrends(data.trends);
        }
      } catch (error) {
        console.error("Failed to load trends queue:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTrends();
  }, []);

  const filteredTrends = useMemo(() => {
    if (filter === "all") return trends;
    return trends.filter(t => t.status === filter);
  }, [trends, filter]);

  const statusCounts = useMemo(() => {
    const counts = { queued: 0, published: 0, archived: 0, rejected: 0 };
    trends.forEach(t => {
      if (t.status in counts) {
        counts[t.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [trends]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Очередь трендов</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Кандидаты в тренды из детектора базы данных
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "all" : status)}
              className={`rounded px-2 py-1 font-medium ${
                filter === status
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {status}: {count}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-center text-xs text-zinc-400">Загрузка очереди трендов...</p>
      ) : filteredTrends.length === 0 ? (
        <p className="mt-4 text-center text-xs text-zinc-500">
          {filter === "all" ? "Очередь пуста" : `Нет элементов со статусом "${filter}"`}
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90">
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Статус</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Балл</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Причина</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Платформа</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Заголовок</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Автор</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Просмотры</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Опубликован</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Выход в тренды</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-600">Обнаружен</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrends.map(trend => (
                  <tr key={trend.id} className="border-b border-zinc-100">
                    <td className="px-2 py-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        trend.status === "queued" ? "bg-yellow-100 text-yellow-800" :
                        trend.status === "published" ? "bg-green-100 text-green-800" :
                        trend.status === "archived" ? "bg-gray-100 text-gray-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {trend.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-medium">{trend.trendScore}</td>
                    <td className="px-2 py-2 max-w-[120px] truncate" title={trend.reason || ""}>
                      {trend.reason || "—"}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        trend.video.platform === "youtube" ? "bg-red-100 text-red-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {trend.video.platform}
                      </span>
                    </td>
                    <td className="px-2 py-2 max-w-[200px] truncate font-medium" title={trend.video.title}>
                      {trend.video.title}
                    </td>
                    <td className="px-2 py-2 max-w-[100px] truncate">
                      {trend.video.authorUsername || "—"}
                    </td>
                    <td className="px-2 py-2">{trend.video.views.toLocaleString("ru-RU")}</td>
                    <td className="px-2 py-2">{formatDt(trend.video.publishedAt)}</td>
                    <td className="px-2 py-2">
                      {trend.publishedAt ? formatDt(trend.publishedAt) : 
                       trend.releaseAt ? formatDt(trend.releaseAt) : "—"}
                    </td>
                    <td className="px-2 py-2">{formatDt(trend.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function AdminVideosApp() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Загрузка админки…
        </div>
      }
    >
      <AdminVideosInner />
    </Suspense>
  );
}
