import "server-only";

import { PrismaClient } from "@prisma/client";
import { assertDatabaseUrl } from "@/lib/env-server";

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };

function isAuthPrismaReady(client: PrismaClient | undefined): boolean {
  return typeof client?.user?.findUnique === "function";
}

/** Base client for Auth.js adapter (no query extension). */
export function getPrismaBase(): PrismaClient {
  const existing = globalForPrisma.prismaBase;
  if (existing) {
    if (isAuthPrismaReady(existing)) return existing;
    void existing.$disconnect().catch(() => {});
  }
  assertDatabaseUrl();
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  globalForPrisma.prismaBase = client;
  return client;
}

/** @deprecated Prefer getPrismaBase(); kept for existing imports. */
export const prismaBase = getPrismaBase();
