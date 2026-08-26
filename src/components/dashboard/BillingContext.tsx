"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BILLING_PLANS, getSubscriptionGrantTokens, type BillingPlanId } from "@/lib/billing/billing.config";

export type BillingState = {
  planId: BillingPlanId;
  planName: string;
  status: string;
  balance: number;
  planTotalTokens: number;
  nextGrantAt: string | null;
  totalSpent: number;
  totalGranted: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<BillingState | null>(null);

type BillingData = {
  planId: BillingPlanId;
  status: string;
  balance: number;
  nextGrantAt: string | null;
  totalSpent: number;
  totalGranted: number;
};

const EMPTY: BillingData = {
  planId: "FREE",
  status: "",
  balance: 0,
  nextGrantAt: null,
  totalSpent: 0,
  totalGranted: 0,
};

/**
 * Единый источник billing-данных на клиенте (один запрос `/api/billing/me`).
 * Используется панелью пользователя и промо-механиками — без дублирования запросов.
 */
export function BillingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BillingData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/me", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as {
        subscription?: { plan?: BillingPlanId; status?: string; nextGrantAt?: string | null };
        wallet?: { balance?: number; totalSpent?: number; totalGranted?: number };
      };
      setData({
        planId: body?.subscription?.plan ?? "FREE",
        status: body?.subscription?.status ?? "",
        balance: body?.wallet?.balance ?? 0,
        nextGrantAt: body?.subscription?.nextGrantAt ?? null,
        totalSpent: body?.wallet?.totalSpent ?? 0,
        totalGranted: body?.wallet?.totalGranted ?? 0,
      });
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const onTokens = () => void refresh();
    window.addEventListener("viral:tokens-updated", onTokens);
    return () => window.removeEventListener("viral:tokens-updated", onTokens);
  }, [refresh]);

  const value = useMemo<BillingState>(() => {
    const planName = BILLING_PLANS[data.planId]?.name ?? BILLING_PLANS.FREE.name;
    return {
      planId: data.planId,
      planName,
      status: data.status,
      balance: data.balance,
      planTotalTokens: getSubscriptionGrantTokens(data.planId),
      nextGrantAt: data.nextGrantAt,
      totalSpent: data.totalSpent,
      totalGranted: data.totalGranted,
      loading,
      refresh,
    };
  }, [data, loading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBilling(): BillingState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useBilling must be used within BillingProvider");
  return value;
}
