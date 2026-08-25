import "server-only";

type SeqResult<T extends readonly (() => Promise<unknown>)[]> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

/**
 * Supabase PgBouncer / `connection_limit=1` cannot run parallel Prisma queries.
 * Use this instead of Promise.all when each task hits the database.
 */
export async function prismaSequential<T extends readonly (() => Promise<unknown>)[]>(
  ...tasks: T
): Promise<SeqResult<T>> {
  const results: unknown[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results as SeqResult<T>;
}
