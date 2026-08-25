import type { DashboardHomePayload } from "@/lib/dashboard-home-types";
import { cachedFetch, invalidateCached, peekCached } from "@/lib/client-fetch-cache";

export type DashboardHomeFetchResult =
  | { ok: true; home: DashboardHomePayload }
  | { ok: false; message: string };

const CACHE_KEY = "api:dashboard:home";

async function fetchDashboardHomeRaw(): Promise<DashboardHomePayload> {
  const res = await fetch("/api/user/dashboard/home", { cache: "no-store" });
  const body = (await res.json()) as { home?: DashboardHomePayload; message?: string };
  if (!res.ok || !body.home) {
    throw new Error(body.message ?? `Ошибка ${res.status}`);
  }
  return body.home;
}

export function peekDashboardHomeCache(): DashboardHomePayload | null {
  return peekCached<DashboardHomePayload>(CACHE_KEY, 120_000, true);
}

export function loadDashboardHome() {
  return cachedFetch(CACHE_KEY, fetchDashboardHomeRaw, {
    ttlMs: 60_000,
    staleMs: 300_000,
    persist: true,
  });
}

export async function fetchDashboardHome(): Promise<DashboardHomeFetchResult> {
  try {
    const { data } = await loadDashboardHome();
    return { ok: true, home: data };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Сеть недоступна",
    };
  }
}

export function invalidateDashboardHomeCache(): void {
  invalidateCached(CACHE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("viral:dashboard-home-invalidate"));
  }
}
