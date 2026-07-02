"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BILLING_PLANS,
  TOKEN_PACKS,
  type BillingInterval,
  type BillingPlanId,
  type TokenPackId,
} from "@/lib/billing/billing.config";

type BillingMe = {
  subscription: {
    plan: BillingPlanId;
    status: string;
    billingInterval: BillingInterval | null;
    nextGrantAt: string | null;
    maxCompetitors: number;
    trialEndsAt: string | null;
  };
  wallet: {
    balance: number;
    totalSpent: number;
    totalGranted: number;
    lastGrantedAt: string | null;
  };
  ledger: {
    items: Array<{
      id: string;
      type: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      reason: string;
      createdAt: string;
    }>;
  };
};

function formatRub(n: number) {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function createOrder(body: Record<string, string>) {
  const res = await fetch("/api/billing/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? data.error ?? "order_failed");
  return data as { orderId: string; amountRub: number; message: string };
}

export function BalanceBanner({ balanceTokens }: { balanceTokens: number }) {
  return (
    <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
      Текущий баланс:{" "}
      <span className="tabular-nums font-bold">{balanceTokens.toLocaleString("ru-RU")}</span> токенов
    </p>
  );
}

export function AccountPlansContent({ balanceTokens }: { balanceTokens: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const subscribe = useCallback(async (plan: "PRO" | "BUSINESS", interval: BillingInterval) => {
    setBusy(`${plan}-${interval}`);
    setMsg(null);
    try {
      const order = await createOrder({ kind: "SUBSCRIPTION", productId: plan, billingInterval: interval });
      setMsg(`${order.message} Заказ ${order.orderId.slice(0, 8)}… на ${formatRub(order.amountRub)}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка заказа");
    } finally {
      setBusy(null);
    }
  }, []);

  const startTrial = useCallback(async () => {
    setBusy("trial");
    setMsg(null);
    try {
      const res = await fetch("/api/billing/trial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "trial_failed");
      setMsg("Пробный период активирован: 200 токенов на 3 дня.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка активации trial");
    } finally {
      setBusy(null);
    }
  }, []);

  const paidPlans = [
    BILLING_PLANS.PRO,
    BILLING_PLANS.BUSINESS,
  ] as const;

  return (
    <>
      <BalanceBanner balanceTokens={balanceTokens} />
      {msg ? <p className="mt-3 text-sm text-zinc-600">{msg}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {paidPlans.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{p.name}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">
              {p.tokensPerPeriod.toLocaleString("ru-RU")}
            </p>
            <p className="text-xs text-zinc-500">токенов / месяц · до {p.maxCompetitors} конкурентов</p>
            <p className="mt-2 text-sm font-semibold text-zinc-800">{formatRub(p.priceMonthlyRub)} / мес</p>
            <p className="text-xs text-zinc-500">{formatRub(p.priceYearlyRub)} / год</p>
            <ul className="mt-2 flex-1 space-y-1 text-xs text-zinc-600">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => subscribe(p.id as "PRO" | "BUSINESS", "MONTHLY")}
                className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === `${p.id}-MONTHLY` ? "…" : "Месяц"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => subscribe(p.id as "PRO" | "BUSINESS", "YEARLY")}
                className="w-full rounded-xl border border-emerald-200 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
              >
                {busy === `${p.id}-YEARLY` ? "…" : "Год"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-4">
        <p className="text-sm font-semibold text-zinc-800">Пробный — {BILLING_PLANS.TRIAL.initialGrantTokens} токенов · 3 дня</p>
        <p className="mt-1 text-xs text-zinc-500">1 конкурент, полный доступ к функциям</p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={startTrial}
          className="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy === "trial" ? "…" : "Активировать пробный"}
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        Бесплатный тариф: {BILLING_PLANS.FREE.initialGrantTokens} токенов один раз, 0 конкурентов.
      </p>
    </>
  );
}

export function AccountTokensContent({ balanceTokens }: { balanceTokens: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const packs = (["SMALL", "MEDIUM", "LARGE"] as TokenPackId[]).map((id) => TOKEN_PACKS[id]);

  const buy = useCallback(async (packId: TokenPackId) => {
    setBusy(packId);
    setMsg(null);
    try {
      const order = await createOrder({ kind: "TOKEN_PACK", productId: packId });
      setMsg(`${order.message} Заказ ${order.orderId.slice(0, 8)}…`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка заказа");
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <>
      <BalanceBanner balanceTokens={balanceTokens} />
      {msg ? <p className="mt-3 text-sm text-zinc-600">{msg}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {packs.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{p.name}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{p.tokens.toLocaleString("ru-RU")}</p>
            <p className="text-xs text-zinc-500">токенов</p>
            <p className="mt-2 text-sm font-semibold text-zinc-800">{formatRub(p.priceRub)}</p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => buy(p.id)}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === p.id ? "…" : "Купить"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export function MyBillingPanel() {
  const [data, setData] = useState<BillingMe | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/me")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr("Не удалось загрузить данные биллинга"));
  }, []);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!data) return <p className="text-sm text-zinc-500">Загрузка…</p>;

  const plan = BILLING_PLANS[data.subscription.plan] ?? BILLING_PLANS.FREE;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Мой тариф</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Тариф</dt>
            <dd className="font-medium">{plan.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Статус</dt>
            <dd className="font-medium">{data.subscription.status}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Баланс</dt>
            <dd className="font-medium tabular-nums">{data.wallet.balance.toLocaleString("ru-RU")} tok</dd>
          </div>
          <div>
            <dt className="text-zinc-500">След. начисление</dt>
            <dd className="font-medium">{formatDate(data.subscription.nextGrantAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Конкуренты</dt>
            <dd className="font-medium">до {data.subscription.maxCompetitors}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Потрачено / начислено</dt>
            <dd className="font-medium tabular-nums">
              {data.wallet.totalSpent.toLocaleString("ru-RU")} / {data.wallet.totalGranted.toLocaleString("ru-RU")}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-800">История операций</h3>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-2 py-1.5">Дата</th>
                <th className="px-2 py-1.5">Тип</th>
                <th className="px-2 py-1.5">Сумма</th>
                <th className="px-2 py-1.5">Баланс</th>
              </tr>
            </thead>
            <tbody>
              {data.ledger.items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="px-2 py-1.5">{row.type}</td>
                  <td className="px-2 py-1.5 tabular-nums">{row.amount > 0 ? `+${row.amount}` : row.amount}</td>
                  <td className="px-2 py-1.5 tabular-nums">{row.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AccountPlansContent balanceTokens={data.wallet.balance} />
      <AccountTokensContent balanceTokens={data.wallet.balance} />
    </div>
  );
}
