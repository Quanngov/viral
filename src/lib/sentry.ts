/**
 * Server-safe Sentry helpers. Complements server-log (stdout); does not replace it.
 */
import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/sentry-config";

export type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
};

export function captureException(error: unknown, context?: CaptureContext): void {
  if (!isSentryEnabled()) return;

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }
    if (context?.fingerprint?.length) {
      scope.setFingerprint(context.fingerprint);
    }
    Sentry.captureException(error);
  });
}

export function captureApiRouteError(routeId: string, error: unknown): void {
  captureException(error, {
    tags: { scope: "api", route: routeId },
    fingerprint: ["api-route", routeId],
  });
}

export function captureDbError(context: string, error: unknown): void {
  captureException(error, {
    tags: { scope: "db", context },
    fingerprint: ["prisma", context],
  });
}

export function captureAiError(event: string, error: unknown, meta?: Record<string, unknown>): void {
  captureException(error, {
    tags: { scope: "ai", event },
    extra: meta,
    fingerprint: ["ai", event],
  });
}
