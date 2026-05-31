# Audits

> Summary of CodeGraph audits and focused reviews. Full detail: `docs/project-audit-master.md`.

## Audit history

| Date | Type | Index / scope |
|------|------|----------------|
| 2026-05-30 | Complexity audit | 159 files, top-20 complex files by deps/fan-in/fan-out/state |
| 2026-05-30 | Architecture audit | Dashboard, auth, cache, Prisma, script generator, scaling |
| 2026-05-30 | Focused technical audit | External search, feed latency, trends polling |
| 2026-05-30 | Engineering fixes | Throttle timing, fail-open read, feed `totalCount` removed |

## Executive verdict (2026-05-30)

**Solid early-production codebase** with strong operational patterns (pool protection, admin circuit breaker, client SWR cache, token refunds) and structural debt (fat routes, UI monoliths, sync ingest in HTTP).

| Dimension | Score (1–5) |
|-----------|-------------|
| Product | 4 |
| Architecture | 3 |
| Maintainability | 2.5 |
| Scalability | 2 |
| User Experience | 3.5 |

## Highest-complexity files (regression hotspots)

| File | Why |
|------|-----|
| `src/app/api/videos/feed/route.ts` | Core search orchestration |
| `src/lib/token-wallet.ts` | Billing + session hub |
| `src/lib/admin-events.ts` | Observability hub (fan-in 26) |
| `ScriptGeneratorSection.tsx` | ~1k lines UI monolith |
| `CompetitorSpySection.tsx` | ~1k lines UI monolith |

## Focused audit — issues & status

| Issue | Severity | Status |
|-------|----------|--------|
| `markExternalSearchMade` before ingest | Medium | **Fixed** 2026-05-30 |
| `canMakeExternalSearch` fail-closed on DB error | Medium | **Fixed** 2026-05-30 |
| Unfiltered `video.count()` on every feed POST | Medium | **Fixed** 2026-05-30 |
| Sync ingest in feed request (latency) | Medium–High | Open |
| Trends poll continues off Home tab (desktop sidebar) | Low–Medium | Open |
| ~70% routes without `withApiRoute` | Low–Medium | Open |
| `mockWeeklyTrends` on home | Low | Open |

## Prisma dual-client clarification

Audits initially flagged «two pools». **Focused review:** runtime app uses one `getPrismaBase()` instance; `prisma` is `$extends` wrapper — not a second pool. Pool pressure comes from query volume (feed, AdminEvent writes), not duplicate clients.

## Monitor in production

- P2024 / Supabase pool timeouts
- p95 `POST /api/videos/feed` with vs without ingest
- AdminEvent circuit breaker activations (60s DB audit gap)
- External ingest `saved: 0` rate in logs

## Canonical full report

See **`docs/project-audit-master.md`** for architecture review, technical debt table, scaling notes, top-20 improvements, and 30-day plan.
