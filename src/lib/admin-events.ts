import { prisma } from "@/lib/prisma";

const SENSITIVE_KEY_RE =
  /token|password|secret|apikey|api_key|authorization|bearer|cookie|set-cookie|tikhub_token|youtube_api/i;

const MAX_META_CHARS = 12_000;
const MAX_STRING = 800;
const MAX_DEPTH = 6;

export type AdminEventLevel = "info" | "warn" | "error" | "debug";
export type AdminEventType =
  | "feed_search"
  | "feed_more"
  | "api_fetch"
  | "api_route_error"
  | "token_spend"
  | "upsert"
  | "error"
  | "admin"
  | "saved_video_add"
  | "saved_video_remove"
  | "saved_videos_open"
  | "competitor_add_start"
  | "competitor_token_spend"
  | "tikhub_competitor_fetch_page"
  | "tikhub_competitor_fetch_done"
  | "competitor_videos_saved"
  | "competitor_add_error"
  | "competitor_delete"
  | "competitor_daily_charge_attempt"
  | "competitor_daily_charge_success"
  | "competitor_daily_charge_failed"
  | "competitor_daily_sync_start"
  | "competitor_daily_sync_success"
  | "competitor_daily_sync_failed"
  | "competitor_daily_sync_skipped"
  | "script_generate_start"
  | "script_generate_success"
  | "script_generate_error"
  | "script_token_spend"
  | "trend_lazy_refresh_started"
  | "trend_db_scan_skipped"
  | "trend_db_scan"
  | "trend_db_scan_finished"
  | "trend_candidates_found"
  | "trend_candidate_queued"
  | "trend_candidate_published"
  | "trend_lazy_discovery_skipped"
  | "trend_lazy_discovery_started"
  | "trend_lazy_discovery_finished"
  | "trend_lazy_discovery_error"
  | "trend_popular_topics_empty"
  | "trend_popular_topics_used"
  | "trend_realtime_error"
  | "trend_lazy_refresh_error"
  | "trend_db_scan_error"
  | "search_log_error"
  | "trend_seed_from_video_started"
  | "trend_seed_from_video_finished"
  | "trend_seed_from_video_skipped"
  | "trend_seed_from_video_error"
  | "trend_pool_ensure_started"
  | "trend_pool_ensure_finished"
  | "trend_pool_ensure_skipped"
  | "trend_pool_ensure_error"
  | "transcript_start"
  | "transcript_cache_hit"
  | "transcript_subtitles_success"
  | "transcript_groq_success"
  | "transcript_failed";

export type LogAdminEventInput = {
  level: AdminEventLevel;
  type: AdminEventType;
  message: string;
  sessionId?: string | null;
  userId?: string | null;
  meta?: unknown;
  /** Stdout only — no Prisma (hot paths / degraded mode). */
  consoleOnly?: boolean;
  /** Same key within throttle window → skip DB write. */
  throttleKey?: string;
};

const THROTTLE_MS = 30_000;
const CIRCUIT_COOLDOWN_MS = 60_000;
const throttleLast = new Map<string, number>();
let dbLogDisabledUntil = 0;
let consecutiveFailures = 0;

function isPrismaPoolError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("connection pool") ||
    msg.includes("Timed out fetching a new connection") ||
    msg.includes("P2024")
  );
}

function canWriteAdminEventToDb(): boolean {
  return Date.now() >= dbLogDisabledUntil;
}

function noteAdminEventFailure(err: unknown): void {
  consecutiveFailures += 1;
  if (isPrismaPoolError(err) || consecutiveFailures >= 2) {
    dbLogDisabledUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  }
}

function isThrottled(key: string): boolean {
  const last = throttleLast.get(key) ?? 0;
  if (Date.now() - last < THROTTLE_MS) return true;
  throttleLast.set(key, Date.now());
  return false;
}

function logAdminEventToConsole(input: LogAdminEventInput): void {
  const line = `[admin-events] ${input.level} ${input.type}: ${input.message}`;
  if (input.level === "error") console.error(line);
  else if (input.level === "warn") console.warn(line);
  else console.info(line);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Убирает секреты, укорачивает строки и глубину — для meta в AdminEvent.
 */
export function safeMeta(input: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[max_depth]";
  if (input == null) return input;
  if (typeof input === "string") {
    if (input.length > MAX_STRING) return `${input.slice(0, MAX_STRING)}…[truncated]`;
    return input;
  }
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (typeof input === "bigint") return String(input);
  if (input instanceof Error) {
    return {
      name: input.name,
      message: input.message.slice(0, 500),
      code: "code" in input ? String((input as NodeJS.ErrnoException).code ?? "") : undefined,
    };
  }
  if (Array.isArray(input)) {
    const cap = 80;
    const arr = input.slice(0, cap).map((x) => safeMeta(x, depth + 1));
    if (input.length > cap) (arr as unknown[]).push(`…+${input.length - cap} items`);
    return arr;
  }
  if (!isPlainObject(input)) return String(input);

  const redactedKeys = new Set(["prompt", "completion", "assistantRaw", "fullResponse", "transcriptJson"]);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (redactedKeys.has(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (k === "raw" || k === "body" || k === "responseJson" || k === "pagination_token" || k === "max_id") {
      out[k] = "[omitted_large]";
      continue;
    }
    out[k] = safeMeta(v, depth + 1);
  }
  return out;
}

export function compactErrorMeta(e: unknown, extra?: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = { ...extra };
  if (e instanceof Error) {
    base.name = e.name;
    base.message = e.message.slice(0, 500);
    const code = (e as NodeJS.ErrnoException).code;
    if (code) base.code = code;
  } else {
    base.message = String(e).slice(0, 500);
  }
  return base;
}

/**
 * Fail-safe observability: never throws, never re-logs to DB on failure.
 * Under pool pressure uses circuit breaker + stdout only.
 */
export async function logAdminEvent(input: LogAdminEventInput): Promise<void> {
  if (input.consoleOnly || !canWriteAdminEventToDb()) {
    logAdminEventToConsole(input);
    return;
  }

  if (input.throttleKey && isThrottled(input.throttleKey)) {
    return;
  }

  try {
    let metaJson: string | null = null;
    if (input.meta !== undefined) {
      const safe = safeMeta(input.meta);
      let s = JSON.stringify(safe);
      if (s.length > MAX_META_CHARS) {
        s = `${s.slice(0, MAX_META_CHARS)}…[truncated_meta]`;
      }
      metaJson = s;
    }
    await prisma.adminEvent.create({
      data: {
        level: input.level,
        type: input.type,
        message: input.message.slice(0, 4000),
        sessionId: input.sessionId ?? null,
        userId: input.userId ?? null,
        metaJson,
      },
    });
    consecutiveFailures = 0;
  } catch (err) {
    noteAdminEventFailure(err);
    console.error(
      "[admin-events] DB log failed; circuit open — stdout only for",
      CIRCUIT_COOLDOWN_MS / 1000,
      "s",
      err instanceof Error ? err.message : err,
    );
    logAdminEventToConsole(input);
  }
}
