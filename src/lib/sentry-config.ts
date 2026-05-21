/**
 * Shared Sentry init options — errors only (no tracing, replay, logs).
 */
export function getSentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;
}

export function isSentryEnabled(): boolean {
  if (!getSentryDsn()) return false;
  if (process.env.SENTRY_ENABLED === "true") return true;
  if (process.env.SENTRY_ENABLED === "false") return false;
  return process.env.NODE_ENV === "production";
}

export const sentryInitOptions = {
  get dsn() {
    return getSentryDsn();
  },
  get enabled() {
    return isSentryEnabled();
  },
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  /** Error monitoring only */
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
} as const;
