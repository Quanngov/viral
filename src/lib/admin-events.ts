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
  | "token_spend"
  | "upsert"
  | "error"
  | "admin";

export type LogAdminEventInput = {
  level: AdminEventLevel;
  type: AdminEventType;
  message: string;
  sessionId?: string | null;
  userId?: string | null;
  meta?: unknown;
};

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

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (k === "raw" || k === "body" || k === "responseJson") {
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

export async function logAdminEvent(input: LogAdminEventInput): Promise<void> {
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
  } catch (err) {
    console.warn("[admin-events] log failed", err instanceof Error ? err.message : err);
  }
}
