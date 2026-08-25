# Backend

> Canonical guardrails. Перенесено из `docs/BACKEND_ARCHITECTURE.md` + дополнения по social sync.

**Do not refactor without reading this.** UI layout, dashboard split, sidebar, and mobile variants are intentionally coupled to stable API response shapes.

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Route handlers | `src/app/api/**/route.ts` | HTTP only: parse input, call lib, return JSON |
| Domain / DB | `src/lib/**` | Prisma, scoring, trends, tokens, feed ingest |
| AI | `src/lib/deepseek-generate.ts`, `script-generator-prompt.ts` | External LLM; no UI imports |
| Serialize | `src/lib/serialize-video.ts`, `format-video.ts` | DB → client DTO |
| Session | `src/lib/session-user.ts` | Cookie session → `SessionUser` |

## Database

- Single Prisma client: `src/lib/prisma.ts` (global singleton).
- Provider: **PostgreSQL** (`DATABASE_URL` + `DIRECT_URL`).
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

## Feed / search pipeline

`POST /api/videos/feed`:

1. `ensureSessionUser`
2. Optional `searchQueryLog.create`
3. `loadAndPick` — up to 800 rows + in-memory filters + `pickSmartMixedBatch`
4. If pool low: parallel YouTube ingest + TikHub Instagram upsert
5. Second `loadAndPick` if ingest ran
6. Token spend only on `action: "more"`

Throttle: `search-throttle.ts` + `appRuntimeState` keys `external_search_{query}` (15 min).

## Trends pipeline

`ensure-trend-pool` → `TrendItem` queue → `/api/trends/realtime` publishes → sidebar polls. Heavy: `POST /api/trends/lazy-refresh`.

## Social Sync pipeline

All platform OAuth and sync flows through `SocialSyncService` (`src/lib/social-sync/social-sync-service.ts`):

- OAuth: `/api/social/oauth/[platform]/start|callback`
- Manual sync: `/api/social/sync`
- Cron: `POST /api/cron/social-sync` (auth: `CRON_SECRET` or `ADMIN_SECRET`)
- Providers: `provider-registry.ts` → youtube, instagram, tiktok
- Queue: `SocialSyncJob` with claim/process/retry
- OAuth tokens: encrypted in `UserSocialOAuthCredential`

## Observability

- **stdout:** `src/lib/server-log.ts`
- **AdminEvent:** `logAdminEvent()` fail-safe (circuit breaker on pool errors)
- **Sentry:** when `NEXT_PUBLIC_SENTRY_DSN` set; helpers in `src/lib/sentry.ts`
- **Perf:** `PERF_AUDIT`, `PERF_TRACE`, `PERF_PRISMA_SLOW_MS`

## Cursor / edit guardrails

**Safe to change:** `src/lib/*`, `src/app/api/*`, `prisma/schema.prisma`, `scripts/*`

**Avoid unless explicitly requested:**

- `src/components/dashboard/*` layout
- `src/app/home-dashboard.tsx` structure
- Modal system, `LiveTrendsSidebar` polling interval UX
- Mass `{ success, data }` migration

## Later (not now)

- Unified `{ success, data }` on all routes
- Repository layer over Prisma
- OpenTelemetry / external logging

## API route inventory (54 handlers)

Группы:
- `auth/` — NextAuth, register
- `videos/` — feed, home, transcribe, trending, thumbnail
- `youtube/` — search cache
- `competitors/` — CRUD, reels, daily-sync
- `saved-videos/` — save state
- `script-generator/` — chats, generate, profile
- `trends/` — realtime, lazy-refresh
- `tokens/` — balance
- `billing/` — config, me, trial, orders
- `user/profile/` — hub, social, refresh, ai-analysis
- `user/dashboard/home/` — dashboard home payload
- `social/` — oauth, sync, webhooks, integration-config
- `cron/social-sync/` — scheduled sync
- `admin/` — stats, videos, trends, billing, social, events, health

## Связанные документы

- [[architecture]]
- [[database]]
- [[authentication]]
- [[instagram]]
- [[youtube]]
