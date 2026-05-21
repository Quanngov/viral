/**
 * Безопасный перенос данных SQLite → Supabase Postgres (Prisma createMany + skipDuplicates).
 *
 * Источник по умолчанию: prisma/dev.db
 * Цель: DATABASE_URL / DIRECT_URL из .env.local
 *
 * Запуск:
 *   npx tsx --tsconfig tsconfig.json scripts/migrate-sqlite-to-supabase.ts
 *   npx tsx --tsconfig tsconfig.json scripts/migrate-sqlite-to-supabase.ts --dry-run
 *   npx tsx --tsconfig tsconfig.json scripts/migrate-sqlite-to-supabase.ts --table=Video
 */
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const DEFAULT_SQLITE_PATH = resolve(process.cwd(), "prisma/dev.db");
const BATCH_SIZE = 200;

type TableSpec = {
  /** Имя таблицы в SQLite (PascalCase) */
  table: string;
  /** Prisma delegate */
  delegate: keyof PrismaClient;
  batchSize?: number;
};

/** Порядок с учётом FK */
const TABLES: TableSpec[] = [
  { table: "SessionUser", delegate: "sessionUser" },
  { table: "UserTokenBalance", delegate: "userTokenBalance" },
  { table: "TokenTransaction", delegate: "tokenTransaction" },
  { table: "Video", delegate: "video", batchSize: 250 },
  { table: "SearchCache", delegate: "searchCache" },
  { table: "CompetitorAccount", delegate: "competitorAccount" },
  { table: "CompetitorDailySync", delegate: "competitorDailySync" },
  { table: "CompetitorVideo", delegate: "competitorVideo" },
  { table: "SavedVideo", delegate: "savedVideo" },
  { table: "ScriptUserProfile", delegate: "scriptUserProfile" },
  { table: "ScriptChat", delegate: "scriptChat" },
  { table: "ScriptMessage", delegate: "scriptMessage" },
  { table: "ScriptChatReference", delegate: "scriptChatReference" },
  { table: "AdminEvent", delegate: "adminEvent", batchSize: 300 },
  { table: "TrendItem", delegate: "trendItem" },
  { table: "SearchQueryLog", delegate: "searchQueryLog" },
  { table: "AppRuntimeState", delegate: "appRuntimeState" },
];

const DATE_FIELDS: Record<string, string[]> = {
  SessionUser: ["createdAt", "updatedAt"],
  UserTokenBalance: ["updatedAt"],
  TokenTransaction: ["createdAt"],
  Video: [
    "publishedAt",
    "createdAt",
    "updatedAt",
    "lastFetchedAt",
    "transcriptCreatedAt",
  ],
  SearchCache: ["createdAt", "expiresAt"],
  CompetitorAccount: ["addedAt", "lastSyncedAt", "createdAt", "updatedAt"],
  CompetitorDailySync: ["chargedAt", "syncedAt"],
  CompetitorVideo: ["publishedAt", "createdAt", "updatedAt", "lastFetchedAt"],
  SavedVideo: ["publishedAt", "createdAt"],
  ScriptUserProfile: ["updatedAt"],
  ScriptChat: ["createdAt", "updatedAt"],
  ScriptMessage: ["createdAt"],
  ScriptChatReference: ["publishedAt", "createdAt"],
  AdminEvent: ["createdAt"],
  TrendItem: ["detectedAt", "releaseAt", "publishedAt", "createdAt", "updatedAt"],
  SearchQueryLog: ["createdAt"],
  AppRuntimeState: ["updatedAt", "createdAt"],
};

const JSON_FIELDS: Record<string, string[]> = {
  Video: ["transcriptJson"],
  TrendItem: ["metricsSnapshot"],
  AppRuntimeState: ["value"],
};

/** Таблицы, где userId должен указывать на SessionUser.id в Postgres */
const USER_ID_TABLES = new Set([
  "UserTokenBalance",
  "TokenTransaction",
  "CompetitorAccount",
  "CompetitorDailySync",
  "SavedVideo",
  "ScriptUserProfile",
  "ScriptChat",
  "SearchQueryLog",
]);

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const tableArg = process.argv.find((a) => a.startsWith("--table="));
  const sqliteArg = process.argv.find((a) => a.startsWith("--sqlite="));
  return {
    dryRun,
    onlyTable: tableArg?.split("=")[1],
    sqlitePath: sqliteArg?.split("=")[1] ?? DEFAULT_SQLITE_PATH,
  };
}

function assertPostgresTarget() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error(
      `DATABASE_URL должен указывать на Postgres (сейчас: ${url.slice(0, 24) || "(пусто)"}). Проверьте .env.local.`,
    );
  }
}

function sqliteJsonQuery<T extends Record<string, unknown>>(
  dbPath: string,
  sql: string,
): T[] {
  const escaped = sql.replace(/"/g, '""');
  const out = execSync(`sqlite3 -json "${dbPath}" "${escaped}"`, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
  if (!out) return [];
  return JSON.parse(out) as T[];
}

function toDate(v: unknown): Date | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v);
  if (typeof v === "string") {
    if (/^\d+$/.test(v)) return new Date(Number(v));
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

function normalizeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const field of DATE_FIELDS[table] ?? []) {
    const d = toDate(out[field]);
    if (d) out[field] = d;
    else if (out[field] != null && out[field] !== "") {
      delete out[field];
    }
  }
  for (const field of JSON_FIELDS[table] ?? []) {
    const v = out[field];
    if (v == null || v === "") {
      out[field] = null;
      continue;
    }
    if (typeof v === "string") {
      try {
        out[field] = JSON.parse(v);
      } catch {
        // оставляем как есть — Prisma может отклонить, залогируем в batch
      }
    }
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function buildSessionUserIdMap(
  pg: PrismaClient,
  sqlitePath: string,
): Promise<Map<string, string>> {
  const sqliteUsers = sqliteJsonQuery<{ id: string; sessionKey: string }>(
    sqlitePath,
    `SELECT id, sessionKey FROM "SessionUser"`,
  );
  const map = new Map<string, string>();

  for (const su of sqliteUsers) {
    const existing = await pg.sessionUser.findUnique({
      where: { sessionKey: su.sessionKey },
      select: { id: true },
    });
    map.set(su.id, existing?.id ?? su.id);
  }

  console.log(`[map] SessionUser id remap: ${map.size} записей (sqlite id → postgres id)`);
  return map;
}

function remapUserId(
  table: string,
  row: Record<string, unknown>,
  userIdMap: Map<string, string>,
): Record<string, unknown> {
  if (!USER_ID_TABLES.has(table) || row.userId == null) return row;
  const mapped = userIdMap.get(String(row.userId));
  if (!mapped) return row;
  return { ...row, userId: mapped };
}

async function migrateTable(
  pg: PrismaClient,
  spec: TableSpec,
  sqlitePath: string,
  dryRun: boolean,
  userIdMap: Map<string, string>,
) {
  const { table, delegate } = spec;
  const batchSize = spec.batchSize ?? BATCH_SIZE;

  const rows = sqliteJsonQuery<Record<string, unknown>>(
    sqlitePath,
    `SELECT * FROM "${table}"`,
  );
  const normalized = rows.map((r) =>
    remapUserId(table, normalizeRow(table, r), userIdMap),
  );

  if (dryRun) {
    const pgBefore = await (pg[delegate] as { count: () => Promise<number> }).count();
    console.log(
      `[dry-run] ${table}: sqlite=${rows.length}, postgres_before=${pgBefore}, would_upsert≈${rows.length} (skipDuplicates)`,
    );
    return { table, sqlite: rows.length, inserted: 0, skipped: rows.length, errors: 0 };
  }

  let inserted = 0;
  let errors = 0;
  const model = pg[delegate] as unknown as {
    count: () => Promise<number>;
    createMany: (args: {
      data: unknown[];
      skipDuplicates: boolean;
    }) => Promise<{ count: number }>;
  };

  const pgBefore = await model.count();

  for (const batch of chunk(normalized, batchSize)) {
    try {
      const result = await model.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
    } catch (error) {
      errors += batch.length;
      console.error(
        `[error] ${table} batch (${batch.length} rows):`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const pgAfter = await model.count();
  const skipped = rows.length - inserted;

  console.log(
    `[ok] ${table}: sqlite=${rows.length}, inserted=${inserted}, skipped≈${skipped}, postgres ${pgBefore}→${pgAfter}, batch_errors=${errors}`,
  );

  return { table, sqlite: rows.length, inserted, skipped, errors };
}

async function main() {
  loadEnvLocal();
  const { dryRun, onlyTable, sqlitePath } = parseArgs();

  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite файл не найден: ${sqlitePath}`);
  }

  assertPostgresTarget();

  const pg = new PrismaClient();

  console.log("=== SQLite → Supabase migration ===");
  console.log(`sqlite: ${sqlitePath}`);
  console.log(`postgres: ${(process.env.DATABASE_URL ?? "").replace(/:[^:@/]+@/, ":***@").slice(0, 80)}...`);
  console.log(`mode: ${dryRun ? "DRY-RUN" : "LIVE"}`);
  if (onlyTable) console.log(`filter: ${onlyTable}`);

  const specs = onlyTable
    ? TABLES.filter((t) => t.table === onlyTable)
    : TABLES;

  if (onlyTable && specs.length === 0) {
    throw new Error(`Неизвестная таблица: ${onlyTable}`);
  }

  const summary = [];
  const userIdMap = await buildSessionUserIdMap(pg, sqlitePath);

  try {
    for (const spec of specs) {
      summary.push(await migrateTable(pg, spec, sqlitePath, dryRun, userIdMap));
    }
  } finally {
    await pg.$disconnect();
  }

  console.log("\n=== Summary ===");
  for (const s of summary) {
    console.log(
      `${s.table}: sqlite=${s.sqlite}, inserted=${s.inserted}, skipped≈${s.skipped}, errors=${s.errors}`,
    );
  }
  console.log(dryRun ? "Dry-run завершён. Запустите без --dry-run для переноса." : "Migration завершена.");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
