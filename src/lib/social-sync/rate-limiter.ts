import "server-only";

import type { SocialPlatform } from "@/lib/profile/profile-types";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const LIMITS: Record<SocialPlatform, { perMinute: number }> = {
  youtube: { perMinute: 60 },
  instagram: { perMinute: 30 },
  tiktok: { perMinute: 30 },
};

export function checkRateLimit(platform: SocialPlatform): { allowed: boolean; retryAfterMs?: number } {
  const key = `platform:${platform}`;
  const limit = LIMITS[platform].perMinute;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function getRateLimitSnapshot(): Record<SocialPlatform, { used: number; limit: number; resetAt: number | null }> {
  const out = {} as Record<SocialPlatform, { used: number; limit: number; resetAt: number | null }>;
  for (const platform of ["youtube", "instagram", "tiktok"] as SocialPlatform[]) {
    const bucket = buckets.get(`platform:${platform}`);
    out[platform] = {
      used: bucket?.count ?? 0,
      limit: LIMITS[platform].perMinute,
      resetAt: bucket?.resetAt ?? null,
    };
  }
  return out;
}
