type CacheEntry<T> = { data: T; at: number };

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const STORAGE_PREFIX = "viral_cache:";

function readPersisted<T>(key: string, maxAgeMs: number): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.at > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writePersisted<T>(key: string, data: T): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, at: Date.now() } satisfies CacheEntry<T>));
  } catch {
    /* quota */
  }
}

export function peekCached<T>(key: string, ttlMs: number, persist?: boolean): T | null {
  const mem = memory.get(key) as CacheEntry<T> | undefined;
  if (mem && Date.now() - mem.at <= ttlMs) return mem.data;
  if (persist) return readPersisted<T>(key, ttlMs);
  return null;
}

export type CachedFetchOptions = {
  ttlMs?: number;
  /** Show stale data while revalidating in background */
  staleMs?: number;
  persist?: boolean;
  /** When false, return stale without firing a background refetch (load shedding). */
  revalidate?: boolean;
};

/**
 * In-memory stale-while-revalidate fetch with in-flight deduplication.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CachedFetchOptions = {},
): Promise<{ data: T; fromCache: boolean }> {
  const ttlMs = opts.ttlMs ?? 120_000;
  const staleMs = opts.staleMs ?? ttlMs * 2;
  const now = Date.now();

  const mem = memory.get(key) as CacheEntry<T> | undefined;
  let stale: T | null = null;
  if (mem) {
    if (now - mem.at <= ttlMs) return { data: mem.data, fromCache: true };
    if (now - mem.at <= staleMs) stale = mem.data;
  }
  if (!stale && opts.persist) {
    stale = readPersisted<T>(key, staleMs);
    if (stale) memory.set(key, { data: stale, at: now - ttlMs });
  }

  const run = async (): Promise<T> => {
    const data = await fetcher();
    memory.set(key, { data, at: Date.now() });
    if (opts.persist) writePersisted(key, data);
    return data;
  };

  if (stale) {
    if (opts.revalidate !== false && !inflight.has(key)) {
      inflight.set(
        key,
        run().finally(() => {
          inflight.delete(key);
        }) as Promise<unknown>,
      );
    }
    return { data: stale, fromCache: true };
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    const data = await pending;
    return { data, fromCache: true };
  }

  const promise = run();
  inflight.set(key, promise as Promise<unknown>);
  try {
    const data = await promise;
    return { data, fromCache: false };
  } finally {
    inflight.delete(key);
  }
}

/** Prime in-memory (+ optional sessionStorage) after SSR or background refresh. */
export function seedCached<T>(key: string, data: T, opts?: { persist?: boolean }): void {
  memory.set(key, { data, at: Date.now() });
  if (opts?.persist) writePersisted(key, data);
}

export function invalidateCached(key: string): void {
  memory.delete(key);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      /* ignore */
    }
  }
}
