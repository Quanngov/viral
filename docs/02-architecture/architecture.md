# Architecture

> Объединяет `project-docs/01-architecture.md` и обзор из `project-docs/00-project-overview.md`.

## High-level

```
Browser (React dashboard)
    ↓
Next.js App Router (src/app)
    ↓
API routes (src/app/api/**)  —  HTTP only
    ↓
Domain lib (src/lib/**)      —  Prisma, business logic, providers
    ↓
PostgreSQL (Supabase) via Prisma
    ↓
External APIs: YouTube, TikHub, Meta Graph, DeepSeek, Groq, TikTok
```

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Route handlers | `src/app/api/**/route.ts` | Parse HTTP, call lib, return JSON |
| Domain / DB | `src/lib/**` | Prisma, scoring, trends, tokens, feed ingest, social sync |
| AI | `deepseek-generate.ts`, `script-generator-prompt.ts` | LLM; server-only |
| Serialize | `serialize-video.ts`, `format-video.ts` | DB → client DTO |
| Session | `session-user.ts`, `token-wallet.ts` | Cookie + NextAuth → `SessionUser` |
| Social | `src/lib/social-sync/**` | OAuth connect, sync queue, providers |

## Major subsystems

| Subsystem | Entry | Docs |
|-----------|-------|------|
| Feed / search | `POST /api/videos/feed` | [[backend]], [[youtube]] |
| Trends | `/api/trends/*` | [[backend]] |
| Script generator | `/api/script-generator/*` | [[ai]] |
| Billing | `/api/billing/*`, `billing-service.ts` | [[features]] |
| Profile Hub | `/api/user/profile/*` | [[features]] |
| Social Sync | `SocialSyncService` | [[instagram]], [[youtube]] |
| Admin | `/admin`, `/api/admin/*` | [[authorization]] |

## Dashboard composition

```
page.tsx (SSR)
  └── HomeDashboard
        ├── AuthSessionProvider
        ├── ToastProvider
        ├── SavedVideosProvider
        └── DashboardLayout
              ├── LiveTrendsSidebar + UserPanel
              └── DashboardTabPanel × tabs (hidden, mounted)
```

## Cache layers (client)

1. `client-fetch-cache.ts` — memory + sessionStorage SWR, dedupe
2. `dashboard-fetch.ts` — keyed loaders
3. SSR seed via `seedDashboardFromSsr`
4. DB `SearchCache` (YouTube search route, 12h TTL)
5. `AppRuntimeState` KV (throttle keys)

## Prisma clients

| Export | File | Role |
|--------|------|------|
| `getPrismaBase()` | `prisma-base.ts` | Base `PrismaClient` |
| `prisma` | `prisma.ts` | `$extends` + Sentry on query errors |
| `prismaSequential` | `prisma-sequential.ts` | Sequential queries (pool protection) |

Runtime: **one** underlying Prisma engine; extended wrapper is not a second pool.

## Observability

- stdout: `server-log.ts`
- `logAdminEvent()` — fail-safe, circuit breaker on pool errors
- Sentry when `NEXT_PUBLIC_SENTRY_DSN` set

## Edit guardrails

**Safe:** `src/lib/*`, `src/app/api/*`, `prisma/schema.prisma`, `scripts/*`

**Avoid unless requested:**
- `src/components/dashboard/*` layout
- `home-dashboard.tsx` structure
- Modal system, LiveTrendsSidebar polling UX
- Mass API response shape migration

Подробности: [[backend]].

## Legacy / unused

- `src/lib/social-integration/` — **not imported** by `src/app/**`; superseded by `social-sync`

## Связанные документы

- [[backend]]
- [[frontend]]
- [[database]]
- [[architecture-decisions]]
- [[code-audit-2026-05-30]]
