# Architecture Decisions

> Только **принятые** решения из кода, `docs/BACKEND_ARCHITECTURE.md`, `project-docs/05-known-decisions.md` и audit. Не предположения.

## Product & API

| ID | Decision | Rationale | Source |
|----|----------|-----------|--------|
| ADR-001 | Stable JSON keys on success responses (`videos`, `balance`, `trends`, …) | Frontend depends on shapes | [[backend]] guardrails |
| ADR-002 | Initial feed search does not spend tokens; only `action: "more"` spends | Product economics | `feed/route.ts` |
| ADR-003 | `force-dynamic` on home page | Fresh SSR each visit | `page.tsx` |
| ADR-004 | Dashboard tabs stay mounted (`hidden`), not unmounted | Preserve scroll/state | `DashboardTabPanel`, guardrails |
| ADR-005 | Billing config single source: `billing.config.ts` | Avoid duplicated prices | `billing.config.ts` |

## Auth & sessions

| ID | Decision | Rationale | Source |
|----|----------|-----------|--------|
| ADR-010 | Dual identity: NextAuth `User` + app `SessionUser` | OAuth vs app data separation | `auth-bridge.ts`, schema |
| ADR-011 | Anonymous users via httpOnly `viral_session_id` | Use before login | `session-user.ts` |
| ADR-012 | `ensureSessionUser()` as API session entry | Single helper | `session-user.ts` |
| ADR-013 | Google `allowDangerousEmailAccountLinking: true` | Link Google to existing email account | `auth.ts` |
| ADR-014 | JWT session strategy (not database sessions for app) | NextAuth config | `auth.ts` |

## Search & ingest

| ID | Decision | Rationale | Source |
|----|----------|-----------|--------|
| ADR-020 | 15-minute external search throttle per normalized query | API quota protection | `search-throttle.ts` |
| ADR-021 | Throttle marked only after successful ingest (`saved > 0`) | Don't lock on failed API | 2026-05-30 fix |
| ADR-022 | Fail-open if throttle **read** fails | DB errors must not block search | 2026-05-30 fix |
| ADR-023 | Ingest runs inside feed HTTP request (no queue yet) | Simplicity; scaling debt accepted | `feed/route.ts`, audit |
| ADR-024 | `loadAndPick` fetches up to 800 rows, filters in memory | Smart-mix candidate pool | `feed/route.ts` |
| ADR-025 | No `totalCount` on feed response | Avoid full-table count per request | 2026-05-30 fix |

## Social sync (2026-07)

| ID | Decision | Rationale | Source |
|----|----------|-----------|--------|
| ADR-030 | All platform OAuth/sync via `SocialSyncService` + `SocialProvider` interface | Unified architecture | `social-sync-service.ts` |
| ADR-031 | OAuth tokens stored encrypted (AES-256-GCM) in DB | Security | `token-crypto.ts` |
| ADR-032 | Instagram: Facebook Login → Graph API (not Instagram Login) | Meta app type alignment | `instagram-provider.ts` |
| ADR-033 | Instagram scopes: `instagram_basic`, `pages_show_list`, `pages_read_engagement` only | Meta app permissions | `instagram-provider.ts` |
| ADR-034 | Instagram insights disabled until `instagram_manage_insights` available | Permission limitation | `instagram-provider.ts` |
| ADR-035 | Instagram webhooks disabled; polling strategy | Provider capabilities | `instagram-provider.ts` |
| ADR-036 | Page access token stored for IG API calls; user token as refreshToken | Meta token model | `instagram-provider.ts` |
| ADR-037 | Meta OAuth errors propagate as `MetaGraphError`, not generic `oauth_connect_failed` | Debuggability | `instagram-provider.ts`, callback route |
| ADR-038 | Legacy `social-integration/` not used; `social-sync/` is canonical | Code structure | grep: no app imports |

## Performance & pool

| ID | Decision | Rationale | Source |
|----|----------|-----------|--------|
| ADR-040 | Stagger saved map (12s) and list (18s) on dashboard load | Supabase pool protection | `home-dashboard.tsx` |
| ADR-041 | Home video count via lazy `GET /api/videos/home?countOnly=1` | Avoid expensive SSR count | `dashboard-fetch.ts` |
| ADR-042 | Trends realtime GET read-only; heavy work in lazy-refresh POST | Load shedding | trends routes |
| ADR-043 | AdminEvent circuit breaker on pool errors (60s DB write cooldown) | Logging must not worsen outages | `admin-events.ts` |
| ADR-044 | `prismaSequential` for parallel-safe sequential queries | Pool protection | `prisma-sequential.ts` |

## AI

| ID | Decision | Rationale | Source |
|----|----------|-----------|--------|
| ADR-050 | Prompts server-only | Security + IP | `script-generator-prompt.ts` |
| ADR-051 | Refund tokens on generate failure after spend | Fair billing | `generate/route.ts` |
| ADR-052 | 60s DeepSeek timeout | Prevent hung requests | `deepseek-generate.ts` |

## Prisma

| ID | Decision | Rationale | Source |
|----|----------|-----------|--------|
| ADR-060 | `prisma` = extended wrapper over `getPrismaBase()` | One engine; Sentry on queries | `prisma.ts` |
| ADR-061 | PostgreSQL only at runtime; SQLite legacy | Supabase migration complete | schema, [[backend]] |

## Intentionally deferred

Documented in [[backend]] «Later (not now)»:
- Unified `{ success, data }` on all routes
- Repository layer over Prisma
- OpenTelemetry

## Связанные документы

- [[architecture]]
- [[backend]]
- [[roadmap]]
- [[code-audit-2026-05-30]]
