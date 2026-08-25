import "server-only";

import { isPerfAuditEnabled, recordExternalCall } from "@/lib/perf/perf-context";

declare global {
  // eslint-disable-next-line no-var
  var __viralPerfFetchWrapped: boolean | undefined;
}

/**
 * PERF_AUDIT=1 only. Wraps global fetch to count external calls.
 * Does not change behavior, only increments a counter when the request is to an absolute URL.
 */
export function ensurePerfServerInit(): void {
  if (!isPerfAuditEnabled()) return;
  if (globalThis.__viralPerfFetchWrapped) return;
  globalThis.__viralPerfFetchWrapped = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const raw =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        recordExternalCall();
      }
    } catch {
      // ignore
    }
    return await originalFetch(input as never, init);
  }) as typeof fetch;
}

