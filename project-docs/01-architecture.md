# Architecture

> Derived from `docs/BACKEND_ARCHITECTURE.md`, codebase, and CodeGraph audits.

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Route handlers | `src/app/api/**/route.ts` | HTTP: parse input, call lib, return JSON |
| Domain / DB | `src/lib/**` | Prisma, scoring, trends, tokens, feed ingest |
| AI | `src/lib/deepseek-generate.ts`, `script-generator-prompt.ts` | External LLM; server-only |
| Serialize | `src/lib/serialize-video.ts`, `format-video.ts` | DB → client DTO |
| Session | `src/lib/token-wallet.ts` | `ensureSessionUser`, token spend/credit |

**Target:** routes stay thin; heavy logic in `src/lib/`. In practice `videos/feed/route.ts` still orchestrates ingest inline.

## Dashboard composition

```
page.tsx (SSR fetchDashboardInitialPayload)
  └── HomeDashboard
        ├── AuthSessionProvider
        ├── ToastProvider
        ├── SavedVideosProvider
        └── DashboardLayout
              ├── aside: LiveTrendsSidebar + UserPanel (desktop)
              └── main: DashboardTabPanel × tabs (hidden, not unmounted)
                    ├── home: SearchResultsSection
                    ├── competitors: CompetitorSpySection
                    ├── saved: SavedVideosSection
                    └── scripts: ScriptsSection → ScriptGeneratorSection
```

- Tab state: URL via `src/lib/dashboard-tab-url.ts`
- `DashboardTabPanel`: keeps children mounted, toggles `hidden`
- Pool protection: saved map/list fetches staggered 12s / 18s in `home-dashboard.tsx`

## Auth model

- **NextAuth** (`src/auth.ts`): Google + credentials, JWT session, `PrismaAdapter(getPrismaBase())`
- **App user** (`SessionUser`): tokens, saved videos, chats, competitors
- **Bridge** (`src/lib/auth-bridge.ts`): links `authUserId` to anonymous `viral_session_id` cookie on sign-in
- **API entry:** `ensureSessionUser()` in `token-wallet.ts` — tries `auth()` first, else httpOnly cookie + DB row

## Prisma clients

| Export | File | Role |
|--------|------|------|
| `getPrismaBase()` | `prisma-base.ts` | Single `new PrismaClient()` — Auth adapter, register route |
| `prisma` | `prisma.ts` | `getPrismaBase().$extends(...)` — Sentry on query errors (except `AdminEvent`) |

Runtime app uses **one** underlying client; extended `prisma` wraps the same base (not a second pool).

## Database

- Provider: PostgreSQL (`DATABASE_URL` pooler + `DIRECT_URL` for migrations)
- Legacy `prisma/dev.db`: migration/backup only, not runtime
- Key models: `Video`, `SessionUser`, `UserTokenBalance`, `CompetitorAccount`, `ScriptChat`, `TrendItem`, `AdminEvent`, `AppRuntimeState`, `SearchCache`

## Feed / search pipeline

`POST /api/videos/feed`:

1. `ensureSessionUser`
2. Optional `searchQueryLog.create`
3. `loadAndPick` — `video.findMany` (take 800) + in-memory filters + `pickSmartMixedBatch`
4. If pool low / search needs fill: parallel `ingestYouTubeShortsForQuery` + TikHub Instagram upsert
5. Second `loadAndPick` if ingest ran
6. Token spend only on `action: "more"` (not initial search)

External search throttle: `src/lib/search-throttle.ts` + `appRuntimeState` keys `external_search_{query}` (15 min).

## Trends pipeline

`ensure-trend-pool` → `TrendItem` queue → `GET /api/trends/realtime` (read-only poll) → sidebar. Heavy work: `POST /api/trends/lazy-refresh`.

## Cache layers (client)

- `src/lib/client-fetch-cache.ts` — memory + sessionStorage SWR, in-flight dedupe
- `src/lib/dashboard-fetch.ts` — keyed loaders (home, trends, tokens, saved, competitors)
- SSR seed: `seedDashboardFromSsr(initial)`
- Home video count: lazy `GET /api/videos/home?countOnly=1` (filtered `HOME_VIDEO_WHERE`), not feed

## Observability

- stdout: `src/lib/server-log.ts`
- `logAdminEvent()` — fail-safe, circuit breaker on pool errors (60s DB write cooldown)
- Sentry: when `NEXT_PUBLIC_SENTRY_DSN` set; `captureDbError` via Prisma extension

## Edit guardrails

**Safe:** `src/lib/*`, `src/app/api/*`, `prisma/schema.prisma`, `scripts/*`

**Avoid unless requested:**

- `src/components/dashboard/*` layout (flex/grid/sticky/variants)
- `src/app/home-dashboard.tsx` structure
- Modal system, `LiveTrendsSidebar` polling interval UX
- Mass `{ success, data }` migration of all endpoints

## API conventions

- Success payloads keep stable keys (`videos`, `balance`, `trends`, …)
- New errors may use `{ success: false, error }` via `withApiRoute` / `apiError`
- ~10 of 34 routes use `withApiRoute`; feed/transcribe/generate use manual handling
