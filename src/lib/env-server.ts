/**
 * Server-only env checks. Import only from API routes / lib (never client components).
 */

let databaseUrlChecked = false;

export function assertDatabaseUrl(): void {
  if (databaseUrlChecked) return;
  databaseUrlChecked = true;

  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) {
    throw new Error("DATABASE_URL is not set. Configure Supabase Postgres in .env.local.");
  }
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error(
      `DATABASE_URL must be PostgreSQL (got ${url.slice(0, 32)}…). Remove legacy file:./dev.db entries.`,
    );
  }
}

export function isPostgresDatabaseUrl(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}
