import "server-only";

import { captureDbError } from "@/lib/sentry";
import { getPrismaBase } from "@/lib/prisma-base";
import { recordPrismaQuery } from "@/lib/perf/perf-context";
import { ensurePerfServerInit } from "@/lib/perf/server-init";

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: AppPrismaClient;
  prismaBaseRef?: ReturnType<typeof getPrismaBase>;
};

function isPrismaDelegateReady(client: AppPrismaClient | undefined): boolean {
  if (!client) return false;
  return (
    typeof client.sessionUser?.findUnique === "function" &&
    typeof client.userOnboardingProfile?.upsert === "function" &&
    typeof client.userSocialAccount?.upsert === "function"
  );
}

/** Next.js hot-reload safe singleton — one pool per process. */
function createPrismaClient() {
  ensurePerfServerInit();
  return getPrismaBase().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const started = performance.now();
          try {
            const result = await query(args);
            recordPrismaQuery({
              model,
              operation,
              durationMs: performance.now() - started,
              rows: Array.isArray(result)
                ? result.length
                : typeof result === "number"
                  ? result
                  : result == null
                    ? 0
                    : 1,
            });
            return result;
          } catch (error) {
            recordPrismaQuery({
              model,
              operation,
              durationMs: performance.now() - started,
            });
            // Avoid observability → DB → observability recursion on AdminEvent writes
            if (model !== "AdminEvent") {
              captureDbError(`${model}.${operation}`, error);
            }
            throw error;
          }
        },
      },
    },
  });
}

function getPrisma(): AppPrismaClient {
  const base = getPrismaBase();
  const existing = globalForPrisma.prisma;
  if (existing && globalForPrisma.prismaBaseRef === base && isPrismaDelegateReady(existing)) {
    return existing;
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaBaseRef = base;
  return client;
}

/**
 * Lazy proxy so imports always resolve the latest client after `prisma generate`
 * or hot-reload — a frozen `const client = getPrisma()` would keep stale delegates.
 */
export const prisma: AppPrismaClient = new Proxy({} as AppPrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client as object, prop) as unknown;
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
