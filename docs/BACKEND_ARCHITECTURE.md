# Backend architecture (Postgres / Supabase)

**Do not refactor without reading this.** UI layout, dashboard split, sidebar, and mobile variants are intentionally coupled to stable API response shapes.

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Route handlers | `src/app/api/**/route.ts` | HTTP only: parse input, call lib, return JSON |
| Domain / DB | `src/lib/**` | Prisma, scoring, trends, tokens, feed ingest |
| AI | `src/lib/deepseek-generate.ts`, `script-generator-prompt.ts` | External LLM; no UI imports |
| Serialize | `src/lib/serialize-video.ts`, `format-video.ts` | DB → client DTO |
| Session | `src/lib/token-wallet.ts` | Cookie session → `SessionUser` (not NextAuth yet in routes) |

## Database

- Single Prisma client: `src/lib/prisma.ts` (global singleton).
- Provider: **PostgreSQL** (`DATABASE_URL` + `DIRECT_URL` in `.env.local`).
- Legacy SQLite: `prisma/dev.db` — backup/migration only; not used at runtime.

## API conventions

- **Success payloads** keep existing keys (`videos`, `balance`, `trends`, …) — frontend depends on them.
- **New errors** may include `{ success: false, error: string }` via `api-route.ts` helpers.
- Prefer `withApiRoute()` for routes without top-level try/catch.
- Heavy logic stays in `src/lib/`, not in route files.

## Client / server boundary

- Client components must **not** import `@/lib/prisma`, `script-chat-reference`, `script-generator-prompt`, or `env-server`.
- Shared strings: `src/lib/script-shared-constants.ts` only.
- Server modules use `import "server-only"` where applicable.

## Cursor / edit guardrails

**Safe to change:** `src/lib/*`, `src/app/api/*`, `prisma/schema.prisma`, `scripts/*`

**Avoid unless explicitly requested:**

- `src/components/dashboard/*` layout (flex/grid/sticky/`variant=`)
- `src/app/home-dashboard.tsx` structure
- Modal system, `LiveTrendsSidebar` polling interval UX
- Mass `{ success, data }` migration of all endpoints at once

## Trends pipeline

`ensure-trend-pool` → `trendItem` queue → `/api/trends/realtime` publishes → sidebar polls.

## Observability

- **stdout:** `src/lib/server-log.ts` (always on).
- **AdminEvent:** `logAdminEvent()` is fail-safe (circuit breaker on pool errors, never throws). Hot path `realtime` uses `consoleOnly` for info logs. Prisma extension skips Sentry on `AdminEvent` model.
- **Sentry:** errors only when `NEXT_PUBLIC_SENTRY_DSN` is set (`production` or `SENTRY_ENABLED=true`). Helpers: `src/lib/sentry.ts`. Manual capture in `withApiRoute`, Prisma extension, AI generate route.

## Later (not now)

- Unified `{ success, data }` on all routes
- NextAuth wiring to replace mock auth UI
- OpenTelemetry / external logging
- Repository layer over Prisma
