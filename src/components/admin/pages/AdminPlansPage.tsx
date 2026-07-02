"use client";

import { useEffect, useState } from "react";
import { BILLING_ACTION_COSTS, BILLING_PLANS, TOKEN_PACKS } from "@/lib/billing/billing.config";
import { AdminInfoTip } from "@/components/admin/shell/AdminInfoTip";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";
import { AdminPreviewBanner } from "@/components/admin/shell/AdminPrimitives";

export function AdminPlansPage() {
  const [draft, setDraft] = useState(BILLING_PLANS);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Тарифы"
        description="Конфигурация планов из billing.config.ts. Редактирование локально — сохранение в прод требует deploy или admin API."
      />

      <AdminPreviewBanner title="Редактирование в UI · сохранение через backend">
        Изменения на этой странице не пишутся в БД. Источник правды сейчас —{" "}
        <code className="rounded bg-amber-100/80 px-1 text-xs">src/lib/billing/billing.config.ts</code>.
      </AdminPreviewBanner>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["FREE", "TRIAL", "PRO", "BUSINESS"] as const).map((id) => {
          const plan = draft[id];
          return (
            <section key={id} className="rounded-xl border border-zinc-200/80 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-zinc-900">{plan.name}</h3>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                  {id}
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <Field
                  label="Цена / мес (₽)"
                  tip="Отображается в биллинге. Годовая цена — отдельное поле."
                  value={String(plan.priceMonthlyRub)}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      [id]: { ...d[id], priceMonthlyRub: Number(v) || 0 },
                    }))
                  }
                />
                <Field
                  label="Токены за период"
                  tip="Начисление при продлении подписки."
                  value={String(plan.tokensPerPeriod)}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      [id]: { ...d[id], tokensPerPeriod: Number(v) || 0 },
                    }))
                  }
                />
                <Field
                  label="Разовый grant"
                  tip="FREE / TRIAL — стартовый баланс при регистрации."
                  value={String(plan.initialGrantTokens)}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      [id]: { ...d[id], initialGrantTokens: Number(v) || 0 },
                    }))
                  }
                />
                <Field
                  label="Макс. конкурентов"
                  value={String(plan.maxCompetitors)}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      [id]: { ...d[id], maxCompetitors: Number(v) || 0 },
                    }))
                  }
                />
              </dl>
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  tip,
  value,
  onChange,
}: {
  label: string;
  tip?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="flex items-center text-xs font-medium text-zinc-600">
        {label}
        {tip ? <AdminInfoTip text={tip} /> : null}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
      />
    </div>
  );
}

export function AdminTokensPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Токены"
        description="Внутренняя валюта платформы: стоимость действий и пакеты пополнения."
      />

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Стоимость действий
          <AdminInfoTip text="Списывается из UserTokenBalance при SEARCH, SCRIPT, TRANSCRIBE и др. Меняется в billing.config.ts." />
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
              <th className="py-2 font-semibold">Действие</th>
              <th className="py-2 font-semibold">Токены</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(BILLING_ACTION_COSTS).map(([k, v]) => (
              <tr key={k} className="border-b border-zinc-50">
                <td className="py-2 font-medium text-zinc-800">{k}</td>
                <td className="py-2 tabular-nums text-zinc-600">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Пакеты токенов</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(["SMALL", "MEDIUM", "LARGE"] as const).map((id) => {
            const p = TOKEN_PACKS[id];
            return (
              <li key={id} className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-zinc-600">
                  {p.priceRub} ₽ · {p.tokens} tok
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
