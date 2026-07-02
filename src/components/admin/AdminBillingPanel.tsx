"use client";

import { useEffect, useState } from "react";
import { BILLING_ACTION_COSTS, BILLING_PLANS, TOKEN_PACKS } from "@/lib/billing/billing.config";

type BillingStats = {
  usersByPlan: Record<string, number>;
  trialUsers: number;
  mrr: number;
  arr: number;
  packSalesCount: number;
  packRevenueRub: number;
  tokensGrantedTotal: number;
  tokensSpentTotal: number;
  tokensBalanceTotal: number;
  paidOrdersCount: number;
};

type AdminBillingPanelProps = {
  appendKey: (path: string) => string;
};

export function AdminBillingPanel({ appendKey }: AdminBillingPanelProps) {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(appendKey("/api/admin/billing/stats"))
      .then((r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then(setStats)
      .catch(() => setErr("Не удалось загрузить биллинг-статистику"));
  }, [appendKey]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5">
      <h2 className="text-sm font-semibold text-zinc-900">Billing & Monetization</h2>
      <p className="mt-1 text-xs text-zinc-500">MRR, пользователи по тарифам, токены, пакеты.</p>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {stats ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="MRR" value={`${stats.mrr.toLocaleString("ru-RU")} ₽`} />
          <Stat label="ARR" value={`${stats.arr.toLocaleString("ru-RU")} ₽`} />
          <Stat label="Trial" value={String(stats.trialUsers)} />
          <Stat label="Пакеты (продаж)" value={String(stats.packSalesCount)} />
          <Stat label="Выручка пакетов" value={`${stats.packRevenueRub.toLocaleString("ru-RU")} ₽`} />
          <Stat label="Начислено tok" value={stats.tokensGrantedTotal.toLocaleString("ru-RU")} />
          <Stat label="Потрачено tok" value={stats.tokensSpentTotal.toLocaleString("ru-RU")} />
          <Stat label="Баланс tok (сумма)" value={stats.tokensBalanceTotal.toLocaleString("ru-RU")} />
        </div>
      ) : null}

      {stats ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Пользователи по тарифам</h3>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {Object.entries(stats.usersByPlan).map(([plan, count]) => (
              <li key={plan} className="rounded-lg bg-zinc-100 px-2 py-1">
                {plan}: <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold text-zinc-700">Тарифы (config)</h3>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            {(["FREE", "TRIAL", "PRO", "BUSINESS"] as const).map((id) => {
              const p = BILLING_PLANS[id];
              return (
                <li key={id}>
                  {p.name}: {p.priceMonthlyRub > 0 ? `${p.priceMonthlyRub} ₽/мес` : "0 ₽"} ·{" "}
                  {p.initialGrantTokens || p.tokensPerPeriod} tok · {p.maxCompetitors} конк.
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-zinc-700">Пакеты и действия</h3>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            {(["SMALL", "MEDIUM", "LARGE"] as const).map((id) => {
              const p = TOKEN_PACKS[id];
              return (
                <li key={id}>
                  {p.name}: {p.priceRub} ₽ · {p.tokens} tok
                </li>
              );
            })}
          </ul>
          <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
            {Object.entries(BILLING_ACTION_COSTS).map(([k, v]) => (
              <li key={k}>
                {k}: {v} tok
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}
