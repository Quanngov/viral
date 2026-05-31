# Known Decisions

> Deliberate choices documented in code, backend docs, or audits. Not a wishlist.

## Product & API

| Decision | Rationale | Source |
|----------|-----------|--------|
| Stable JSON keys on success responses | Frontend depends on `videos`, `balance`, `trends`, etc. | `BACKEND_ARCHITECTURE.md` |
| Initial feed search does not spend tokens | Only `action: "more"` calls `spendTokens` | `feed/route.ts` |
| `force-dynamic` on home page | Fresh SSR payload each visit | `page.tsx` |
| Dashboard tabs stay mounted (`hidden`) | Preserve scroll/state | `DashboardTabPanel.tsx`, backend guardrails |

## Auth & sessions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Dual identity: NextAuth `User` + app `SessionUser` | Tokens/saved data on `SessionUser`; OAuth on `User` | `auth-bridge.ts`, schema |
| Anonymous users via httpOnly `viral_session_id` | Use product before login | `token-wallet.ts` |
| `ensureSessionUser()` is API session entry | Single helper for routes | `token-wallet.ts` |
| Google `allowDangerousEmailAccountLinking: true` | Link Google to existing email account | `auth.ts` |

## Search & ingest

| Decision | Rationale | Source |
|----------|-----------|--------|
| 15-minute external search throttle per normalized query | Reduce YouTube/TikHub quota use | `search-throttle.ts` |
| Throttle marked only after successful ingest (`saved > 0`) | Avoid locking users out on failed API | **2026-05-30 fix**, `feed/route.ts` |
| Fail-open if throttle **read** fails | DB errors must not block ingest | **2026-05-30 fix**, `search-throttle.ts` |
| Ingest runs inside feed HTTP request | No background queue yet | Audits, `feed/route.ts` |
| `loadAndPick` fetches up to 800 rows then filters in memory | Smart-mix over candidate pool | `feed/route.ts` |

## Performance & pool

| Decision | Rationale | Source |
|----------|-----------|--------|
| Stagger saved map (12s) and list (18s) on dashboard load | Protect Supabase pool on free tier | `home-dashboard.tsx` |
| Home count via lazy `/api/videos/home?countOnly=1` | Avoid expensive count on SSR paint | `dashboard-fetch.ts`, `dashboard-home.ts` |
| No `totalCount` on feed response | Removed full-table count per request | **2026-05-30 fix** |
| Trends realtime GET is read-only | Heavy discovery in `lazy-refresh` POST | `trends/realtime/route.ts`, backend doc |
| AdminEvent circuit breaker on pool errors | Logging must not worsen outages | `admin-events.ts` |

## AI

| Decision | Rationale | Source |
|----------|-----------|--------|
| Prompts server-only | Security + IP | `script-generator-prompt.ts` |
| Refund tokens on generate failure after spend | Fair billing | `generate/route.ts` |
| 60s DeepSeek timeout | Prevent hung requests | `deepseek-generate.ts` |

## Prisma

| Decision | Rationale | Source |
|----------|-----------|--------|
| `prisma` = extended wrapper over `getPrismaBase()` | One engine; Sentry on queries | `prisma.ts`, focused audit |
| Auth adapter uses base client without extension | Adapter compatibility | `prisma-base.ts`, `auth.ts` |

## Intentionally deferred (BACKEND_ARCHITECTURE «Later»)

- Unified `{ success, data }` on all routes
- Repository layer over Prisma
- OpenTelemetry / external logging
- Note: backend doc says «NextAuth not in routes yet» — **stale**; `ensureSessionUser` already calls `auth()`
