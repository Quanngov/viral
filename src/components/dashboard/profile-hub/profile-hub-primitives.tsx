"use client";

import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function ProfileSection({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-900/5 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProfileSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-breathe h-14 rounded-xl bg-zinc-100" />
      ))}
    </div>
  );
}

export function ProfileStatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`profile-hub-stat-enter rounded-xl border px-3 py-2.5 ${
        accent ? "border-emerald-200 bg-emerald-50/70" : "border-zinc-100 bg-zinc-50/80"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums tracking-tight ${accent ? "text-emerald-900" : "text-zinc-900"}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function PremiumLockOverlay({
  title,
  description,
  onUpgrade,
}: {
  title: string;
  description: string;
  onUpgrade?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="profile-hub-premium-blur min-h-[120px] rounded-xl bg-zinc-50 p-4">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-zinc-200/80" />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/55 p-4 text-center backdrop-blur-[2px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
          <Sparkles className="h-3 w-3" aria-hidden />
          Premium
        </span>
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="max-w-xs text-xs leading-relaxed text-zinc-600">{description}</p>
        {onUpgrade ? (
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Улучшить тариф
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function IntegrationBadge({ source }: { source: "pending" | "api" | "manual" }) {
  if (source === "api") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
        API
      </span>
    );
  }
  if (source === "manual") {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
        Вручную
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
      Скоро · API
    </span>
  );
}

export function formatProfileRefreshLabel(iso: string | null, justRefreshed: boolean): string {
  if (justRefreshed) return "Обновлено только что";
  if (!iso) return "Статистика ещё не обновлялась";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 120_000) return "Обновлено только что";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Последнее обновление: меньше часа назад";
  const mod10 = hours % 10;
  const mod100 = hours % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "час"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "часа"
        : "часов";
  return `Последнее обновление: ${hours} ${word} назад`;
}

export function formatStatValue(n: number | null, suffix = ""): string {
  if (n == null) return "—";
  return `${n.toLocaleString("ru-RU")}${suffix}`;
}

export function formatPercent(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
