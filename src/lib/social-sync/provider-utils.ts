import "server-only";

import type { ClassifiedSyncError } from "./social-sync.types";

export function classifyHttpError(status: number, body?: string): ClassifiedSyncError {
  const lower = (body ?? "").toLowerCase();
  if (status === 401 || lower.includes("invalid_token") || lower.includes("expired")) {
    return { code: "token_expired", message: "OAuth token expired", retryable: false };
  }
  if (status === 403 || lower.includes("revoked") || lower.includes("permission")) {
    return { code: "token_revoked", message: "Permissions revoked", retryable: false };
  }
  if (status === 429) {
    return { code: "rate_limited", message: "Rate limit exceeded", retryable: true, retryAfterMs: 60_000 };
  }
  if (status >= 500) {
    return { code: "provider_down", message: `Provider error ${status}`, retryable: true, retryAfterMs: 120_000 };
  }
  return { code: "unknown", message: body || `HTTP ${status}`, retryable: status >= 500 };
}

export function classifyNetworkError(error: unknown): ClassifiedSyncError {
  const msg = error instanceof Error ? error.message : String(error);
  return { code: "network_error", message: msg, retryable: true, retryAfterMs: 30_000 };
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; body: string }> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body: text };
    return { ok: true, data: JSON.parse(text) as T, status: res.status };
  } catch (error) {
    throw error;
  }
}

export function estimateMonthlyViews(avgViews: number | null): number | null {
  if (avgViews == null) return null;
  return Math.round(avgViews * 4.33);
}

export function avgFrom(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function engagementRate(views: number, likes: number, comments: number): number | null {
  if (views <= 0) return null;
  return Math.round(((likes + comments) / views) * 10000) / 100;
}
