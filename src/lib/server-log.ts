/**
 * Lightweight server logging (stdout). Sentry capture is additive via @/lib/sentry.
 */
import { captureAiError, captureDbError } from "@/lib/sentry";

export type LogScope = "api" | "db" | "ai" | "trends";

function prefix(scope: LogScope, route?: string): string {
  return route ? `[${scope}:${route}]` : `[${scope}]`;
}

export function logInfo(scope: LogScope, message: string, meta?: Record<string, unknown>, route?: string): void {
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  console.info(prefix(scope, route), line);
}

export function logRouteError(route: string, error: unknown, meta?: Record<string, unknown>): void {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(prefix("api", route), msg, meta ?? "", stack ?? "");
}

export function logDbError(context: string, error: unknown): void {
  logRouteError(`db.${context}`, error);
  captureDbError(context, error);
}

export function logAiEvent(
  event: string,
  meta?: Record<string, unknown> & { durationMs?: number; ok?: boolean },
): void {
  logInfo("ai", event, meta, "deepseek");
  if (meta?.ok === false && meta?.error) {
    captureAiError(event, meta.error, meta);
  }
}
