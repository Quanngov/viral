"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  History,
  MousePointerClick,
  RefreshCw,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

/**
 * Раздел «Использование токенов» внутри вкладки «Настройки аккаунта».
 *
 * Переиспользует существующий `/api/billing/me` (wallet + ledger) — без новых
 * API/backend. Если данных пока нет — аккуратные empty state.
 */
export function TokenUsageSection() {
  const [period, setPeriod] = useState<PeriodId>("30d");
  const [data, setData] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/billing/me?ledgerLimit=100", { cache: "no-store" });
    if (!res.ok) throw new Error("Не удалось загрузить данные");
    return (await res.json()) as BillingMe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await fetchData();
        if (!cancelled) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить статистику использования.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const json = await fetchData();
        setData(json);
        setError(null);
      } catch {
        setError("Не удалось загрузить статистику использования.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchData]);

  const spendItems = useMemo(() => (data?.ledger.items ?? []).filter((i) => i.type === "SPEND"), [data]);
  const allItems = useMemo(() => data?.ledger.items ?? [], [data]);

  const periodDays = period === "all" ? null : getPeriodDays(period);
  const periodItems =
    periodDays === null
      ? spendItems
      : spendItems.filter(
          (i) => new Date(i.createdAt).getTime() >= new Date().getTime() - periodDays * 86400000,
        );

  const stats = {
    spentTokens: data?.wallet.totalSpent ?? 0,
    usedTokens: periodItems.reduce((s, i) => s + Math.abs(i.amount), 0),
    usedFunctions: periodItems.length,
    generations: periodItems.filter(isScript).length,
  };

  const series = useMemo(() => {
    const days = period === "all" ? 90 : getPeriodDays(period);
    return buildSeries(spendItems, days);
  }, [spendItems, period]);

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "";

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-red-900">{error}</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" /> Повторить
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-14 text-zinc-400">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Использование токенов</h2>
          <p className="mt-1 text-sm text-zinc-500">История использования токенов и статистика</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </button>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodId)}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-900">Обзор использования</h3>
          <span className="text-xs text-zinc-500">за {periodLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Wallet className="h-5 w-5" />}
            label="Потрачено токенов"
            value={formatNumber(stats.spentTokens)}
          />
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="Использовано токенов"
            value={formatNumber(stats.usedTokens)}
          />
          <StatCard
            icon={<MousePointerClick className="h-5 w-5" />}
            label="Использовано функций"
            value={formatNumber(stats.usedFunctions)}
          />
          <StatCard
            icon={<Sparkles className="h-5 w-5" />}
            label="Всего генераций"
            value={formatNumber(stats.generations)}
          />
        </div>
      </section>

      {/* Chart */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-600" />
          <h3 className="text-base font-semibold text-zinc-900">Динамика расхода</h3>
        </div>
        {series.some((s) => s.value > 0) ? (
          <ChartBars series={series} />
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="Данных об использовании пока нет"
            text="Статистика появится здесь после использования токенов."
          />
        )}
      </section>

      {/* History */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-600" />
          <h3 className="text-base font-semibold text-zinc-900">История использования</h3>
        </div>
        {allItems.length > 0 ? (
          <HistoryTable items={allItems} />
        ) : (
          <EmptyState
            icon={<History className="h-8 w-8" />}
            title="Истории использования пока нет"
            text="Операции с токенами появятся здесь после их использования."
          />
        )}
      </section>
    </div>
  );
}

type PeriodId = "30d" | "90d" | "all";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "30d", label: "30 дней" },
  { id: "90d", label: "90 дней" },
  { id: "all", label: "Всё время" },
];

type LedgerItem = {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  source: string | null;
  createdAt: string;
};

type BillingMe = {
  wallet: { balance: number; totalSpent: number; totalGranted: number; lastGrantedAt: string | null };
  ledger: { items: LedgerItem[]; nextCursor: string | null };
};

const FUNCTION_LABELS: Record<string, string> = {
  script_generator: "Генерация сценария",
  video_transcription: "Транскрибация",
  feed_search: "Поиск роликов",
  feed_show_more: "Показать ещё",
  competitor_instagram_add: "Добавление конкурента",
  competitor_youtube_add: "Добавление конкурента",
  competitor_instagram_refresh_reels: "Обновление Reels",
  competitor_daily_sync: "Ежедневная синхронизация",
};

function getPeriodDays(period: PeriodId): number {
  return period === "30d" ? 30 : 90;
}

function describeReason(reason: string): string {
  return FUNCTION_LABELS[reason] ?? reason.replace(/_/g, " ");
}

function describeType(type: string): string {
  switch (type) {
    case "SPEND":
      return "Расход";
    case "REFUND":
      return "Возврат";
    case "SUBSCRIPTION_GRANT":
      return "Начисление по тарифу";
    case "TRIAL_GRANT":
      return "Пробный период";
    case "FREE_GRANT":
      return "Бесплатный старт";
    case "TOKEN_PACK":
      return "Пополнение токенов";
    case "ADMIN_ADJUSTMENT":
      return "Корректировка";
    default:
      return type.replace(/_/g, " ");
  }
}

function isScript(item: LedgerItem): boolean {
  return item.reason === "script_generator";
}

function formatNumber(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString("ru-RU");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Строит серию баров расхода (SPEND) по дням, агрегируя до ~12 точек. */
function buildSeries(items: LedgerItem[], days: number): { label: string; value: number }[] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const byDay = new Map<string, number>();
  for (const it of items) {
    if (it.type !== "SPEND" || it.amount >= 0) continue;
    const key = new Date(it.createdAt).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Math.abs(it.amount));
  }

  const daysArr: { label: string; value: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    daysArr.push({ label: key.slice(5), value: byDay.get(key) ?? 0 });
  }

  const target = 12;
  const chunk = Math.max(1, Math.ceil(daysArr.length / target));
  const bars: { label: string; value: number }[] = [];
  for (let i = 0; i < daysArr.length; i += chunk) {
    const slice = daysArr.slice(i, i + chunk);
    bars.push({ label: slice[0].label, value: slice.reduce((s, b) => s + b.value, 0) });
  }
  return bars;
}


function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">{label}</p>
    </div>
  );
}

function ChartBars({ series }: { series: { label: string; value: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {series.map((s, i) => (
          <div
            key={i}
            className="group relative flex flex-1 flex-col items-center justify-end"
            title={`${s.label}: ${formatNumber(s.value)} токенов`}
          >
            <div
              className="w-full rounded-t-md bg-emerald-500/80 transition-colors group-hover:bg-emerald-600"
              style={{ height: s.value > 0 ? `${Math.max(6, (s.value / max) * 100)}%` : "4px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {series.map((s, i) => (
          <span key={i} className="flex-1 text-center text-[10px] tabular-nums text-zinc-400">
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HistoryTable({ items }: { items: LedgerItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs font-medium uppercase tracking-wide text-zinc-400">
            <th className="py-2 pr-3 font-medium">Дата</th>
            <th className="py-2 pr-3 font-medium">Действие</th>
            <th className="py-2 pr-3 font-medium">Тип</th>
            <th className="py-2 pr-3 text-right font-medium">Токены</th>
            <th className="py-2 text-right font-medium">Баланс</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const isSpend = it.type === "SPEND" || it.amount < 0;
            return (
              <tr key={it.id} className="border-b border-zinc-50 last:border-0">
                <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-zinc-600">
                  {formatDate(it.createdAt)}
                </td>
                <td className="py-2.5 pr-3 font-medium text-zinc-800">{describeReason(it.reason)}</td>
                <td className="py-2.5 pr-3 text-zinc-500">{describeType(it.type)}</td>
                <td
                  className={`whitespace-nowrap py-2.5 pr-3 text-right font-semibold tabular-nums ${
                    isSpend ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {isSpend ? `−${formatNumber(Math.abs(it.amount))}` : `+${formatNumber(it.amount)}`}
                </td>
                <td className="py-2.5 text-right tabular-nums text-zinc-600">
                  {formatNumber(it.balanceAfter)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-zinc-800">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-zinc-500">{text}</p>
    </div>
  );
}
