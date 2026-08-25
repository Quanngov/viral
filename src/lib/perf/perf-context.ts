import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export type PerfPrismaQuery = {
  model?: string;
  operation?: string;
  durationMs: number;
  rows?: number;
  sql?: string;
};

export type PerfSnapshot = {
  label: string;
  startedAtMs: number;
  endedAtMs: number | null;
  prismaQueryCount: number;
  prismaTotalMs: number;
  prismaSlowQueries: PerfPrismaQuery[];
  prismaTrace: PerfPrismaQuery[];
  externalCallCount: number;
};

type PerfStore = {
  label: string;
  startedAtMs: number;
  prismaQueryCount: number;
  prismaTotalMs: number;
  prismaSlowQueries: PerfPrismaQuery[];
  prismaTrace: PerfPrismaQuery[];
  externalCallCount: number;
};

// Turbopack/Next may bundle this module more than once. Pin a single
// AsyncLocalStorage instance on globalThis so every copy shares one context;
// otherwise the Prisma extension and the route wrapper would use different
// stores and query counts would always read as 0.
const globalForPerf = globalThis as unknown as {
  __viralPerfStore?: AsyncLocalStorage<PerfStore>;
};
const store: AsyncLocalStorage<PerfStore> =
  globalForPerf.__viralPerfStore ?? (globalForPerf.__viralPerfStore = new AsyncLocalStorage<PerfStore>());

export function isPerfAuditEnabled(): boolean {
  return process.env.PERF_AUDIT === "1";
}

export function isPerfTraceEnabled(): boolean {
  return process.env.PERF_TRACE === "1";
}

export function getPerfStore(): PerfStore | null {
  return store.getStore() ?? null;
}

export async function runWithPerfContext<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isPerfAuditEnabled()) return await fn();
  return await store.run(
    {
      label,
      startedAtMs: performance.now(),
      prismaQueryCount: 0,
      prismaTotalMs: 0,
      prismaSlowQueries: [],
      prismaTrace: [],
      externalCallCount: 0,
    },
    fn,
  );
}

export async function runWithPerfContextSnapshot<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; perf: PerfSnapshot | null }> {
  if (!isPerfAuditEnabled()) {
    const result = await fn();
    return { result, perf: null };
  }

  return await store.run(
    {
      label,
      startedAtMs: performance.now(),
      prismaQueryCount: 0,
      prismaTotalMs: 0,
      prismaSlowQueries: [],
      prismaTrace: [],
      externalCallCount: 0,
    },
    async () => {
      try {
        const result = await fn();
        const perf = snapshotPerf();
        return { result, perf };
      } finally {
        // no-op
      }
    },
  );
}

export function recordExternalCall(): void {
  const s = store.getStore();
  if (!s) return;
  s.externalCallCount += 1;
}

export function recordPrismaQuery(q: PerfPrismaQuery): void {
  const s = store.getStore();
  if (!s) return;
  s.prismaQueryCount += 1;
  s.prismaTotalMs += q.durationMs;

  // Full ordered trace (bounded) — only when explicitly tracing.
  if (isPerfTraceEnabled() && s.prismaTrace.length < 500) {
    s.prismaTrace.push(q);
  }

  // Keep a small list of slow queries for the report.
  const slowThreshold = Number(process.env.PERF_PRISMA_SLOW_MS ?? 50);
  if (q.durationMs >= slowThreshold) {
    s.prismaSlowQueries.push(q);
    if (s.prismaSlowQueries.length > 10) {
      s.prismaSlowQueries.sort((a, b) => b.durationMs - a.durationMs);
      s.prismaSlowQueries.length = 10;
    }
  }
}

export function snapshotPerf(): PerfSnapshot | null {
  const s = store.getStore();
  if (!s) return null;
  const now = performance.now();
  return {
    label: s.label,
    startedAtMs: s.startedAtMs,
    endedAtMs: now,
    prismaQueryCount: s.prismaQueryCount,
    prismaTotalMs: s.prismaTotalMs,
    prismaSlowQueries: [...s.prismaSlowQueries].sort((a, b) => b.durationMs - a.durationMs),
    prismaTrace: [...s.prismaTrace],
    externalCallCount: s.externalCallCount,
  };
}

