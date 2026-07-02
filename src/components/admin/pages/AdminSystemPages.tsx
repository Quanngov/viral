"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { AdminInfoTip } from "@/components/admin/shell/AdminInfoTip";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";

/** Client-safe model labels (env values resolved server-side in routes). */
const MODEL_CATALOG = [
  {
    id: "deepseek-chat",
    provider: "DeepSeek",
    role: "Script generation",
    envKey: "DEEPSEEK_MODEL",
    default: "deepseek-v4-flash",
    tip: "Основная модель для сценариев. Temperature и max_tokens — в generate route.",
  },
  {
    id: "groq-whisper",
    provider: "Groq",
    role: "Transcription",
    envKey: "GROQ_WHISPER_MODEL",
    default: "whisper-large-v3-turbo",
    tip: "Аудио → текст для референсов и транскрибации роликов.",
  },
];

export function AdminAiModelsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="AI-модели"
        description="Маршрутизация LLM и speech-to-text. Значения по умолчанию из env."
      />

      <div className="grid gap-3">
        {MODEL_CATALOG.map((m) => (
          <section key={m.id} className="rounded-xl border border-zinc-200/80 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-zinc-900">{m.provider}</h2>
                <p className="text-sm text-zinc-500">{m.role}</p>
              </div>
              <code className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{m.envKey}</code>
            </div>
            <p className="mt-3 text-sm text-zinc-700">
              Default: <span className="font-mono font-semibold">{m.default}</span>
              <AdminInfoTip text={m.tip} />
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

export function AdminProvidersPage() {
  const { appendKey } = useAdmin();
  const [health, setHealth] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    void fetch(appendKey("/api/admin/health"))
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [appendKey]);

  const providers = [
    { name: "TikHub", key: "tikhub", use: "Instagram reels ingest" },
    { name: "YouTube Data API", key: "youtube", use: "Search & metadata" },
    { name: "DeepSeek", key: "deepseek", use: "Script generation" },
    { name: "Groq", key: "groq", use: "Whisper transcription" },
    { name: "Supabase Postgres", key: "database", use: "Primary database" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Провайдеры"
        description="Health-check внешних сервисов. Только статус подключения, без секретов."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((p) => {
          const status = health?.[p.key];
          const ok = status === "connected";
          return (
            <section key={p.key} className="rounded-xl border border-zinc-200/80 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-zinc-900">{p.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {ok ? "connected" : "missing"}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{p.use}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const { appendKey } = useAdmin();
  const [stats, setStats] = useState<{
    totalVideos: number;
    youtubeCount: number;
    instagramCount: number;
    avgScore: number | null;
  } | null>(null);
  const [billing, setBilling] = useState<{
    mrr: number;
    trialUsers: number;
    tokensSpentTotal: number;
    usersByPlan: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const sr = await fetch(appendKey("/api/admin/stats"));
        if (sr.ok) setStats(await sr.json());
      } catch {
        /* */
      }
      try {
        const br = await fetch(appendKey("/api/admin/billing/stats"));
        if (br.ok) setBilling(await br.json());
      } catch {
        /* billing may 403 without secret */
      }
    })();
  }, [appendKey]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Аналитика"
        description="Операционные метрики из доступных admin API. Расширенная аналитика — в preview."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Роликов в базе" value={stats?.totalVideos} live />
        <Metric label="YouTube" value={stats?.youtubeCount} live />
        <Metric label="Instagram" value={stats?.instagramCount} live />
        <Metric label="MRR (₽)" value={billing?.mrr} live />
        <Metric label="Trial users" value={billing?.trialUsers} live />
        <Metric label="Токенов потрачено" value={billing?.tokensSpentTotal} live />
        <Metric label="Поисков / день" value={null} preview />
        <Metric label="Скриптов / день" value={null} preview />
      </section>

      {billing?.usersByPlan ? (
        <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Пользователи по тарифам</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {Object.entries(billing.usersByPlan).map(([plan, count]) => (
              <li key={plan} className="rounded-lg bg-zinc-100 px-3 py-1.5">
                {plan}: <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  live,
}: {
  label: string;
  value: number | null | undefined;
  live?: boolean;
  preview?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
        {value != null ? value.toLocaleString("ru-RU") : "—"}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase text-zinc-400">{live ? "live api" : "preview"}</p>
    </div>
  );
}

export function AdminHealthPage() {
  const { appendKey } = useAdmin();
  const [stats, setStats] = useState<{ totalVideos: number; lastActivityAt: string | null } | null>(null);

  useEffect(() => {
    void fetch(appendKey("/api/admin/stats"))
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, [appendKey]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="System Health"
        description="Состояние БД и последняя активность индексации."
      />
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Database</h2>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{stats?.totalVideos?.toLocaleString("ru-RU") ?? "—"}</p>
          <p className="text-xs text-zinc-500">видео в Video table</p>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Последняя активность</h2>
          <p className="mt-2 text-sm font-medium text-zinc-800">
            {stats?.lastActivityAt ? new Date(stats.lastActivityAt).toLocaleString("ru-RU") : "—"}
          </p>
        </div>
      </section>
      <AdminPreviewBannerInline />
    </div>
  );
}

function AdminPreviewBannerInline() {
  return (
    <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-500">
      Cache, storage quotas и connection pool metrics — preview (требуется observability API).
    </p>
  );
}
