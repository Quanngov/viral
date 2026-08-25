import "server-only";

import { PrismaClient } from "@prisma/client";
import { assertDatabaseUrl } from "@/lib/env-server";
import { isPerfAuditEnabled } from "@/lib/perf/perf-context";
import { ensurePerfServerInit } from "@/lib/perf/server-init";

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };

/** True when generated client includes auth + profile-hub delegates. */
function isPrismaBaseReady(client: PrismaClient | undefined): boolean {
  if (!client) return false;
  return (
    typeof client.user?.findUnique === "function" &&
    typeof client.sessionUser?.findUnique === "function" &&
    typeof client.userOnboardingProfile?.upsert === "function" &&
    typeof client.userSocialAccount?.upsert === "function"
  );
}

/**
 * Single PrismaClient for the process (Auth adapter + app queries share one pool).
 * Never disconnect/recreate at runtime — that orphans pool slots on Supabase pooler (limit 1).
 * After `prisma generate`, restart the dev server instead of hot-swapping clients.
 */
export function getPrismaBase(): PrismaClient {
  const existing = globalForPrisma.prismaBase;
  if (existing) {
    if (!isPrismaBaseReady(existing) && process.env.NODE_ENV === "development") {
      console.warn(
        "[prisma] Stale Prisma client delegates detected — run `npx prisma generate` and restart the dev server.",
      );
    }
    return existing;
  }

  assertDatabaseUrl();
  ensurePerfServerInit();
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  globalForPrisma.prismaBase = client;
  return client;
}
