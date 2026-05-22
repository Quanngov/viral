import "server-only";

import { captureDbError } from "@/lib/sentry";
import { getPrismaBase } from "@/lib/prisma-base";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
  prismaBaseRef?: ReturnType<typeof getPrismaBase>;
};

/** Next.js hot-reload safe singleton — one pool per process. */
function createPrismaClient() {
  return getPrismaBase().$extends({
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

function getPrisma() {
  const base = getPrismaBase();
  if (globalForPrisma.prisma && globalForPrisma.prismaBaseRef === base) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaBaseRef = base;
  return client;
}

export const prisma = getPrisma();
