import "server-only";

import { PrismaClient } from "@prisma/client";
import { assertDatabaseUrl } from "@/lib/env-server";
import { captureDbError } from "@/lib/sentry";

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

/** Next.js hot-reload safe singleton — one pool per process. */
function createPrismaClient() {
  assertDatabaseUrl();
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          try {
            return await query(args);
          } catch (error) {
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
