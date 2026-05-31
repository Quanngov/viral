# Roadmap

> From `docs/project-audit-master.md` and post-audit fix status. Not a commitment schedule.

## Completed (2026-05-30)

- [x] External search throttle after successful ingest only
- [x] Fail-open `canMakeExternalSearch` on DB read errors
- [x] Remove wasteful `prisma.video.count()` from feed response

## Next 30 days (from audit — adjusted)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | Extract feed orchestration to `lib/feed/*` | P0 | Keep JSON contract stable |
| 2 | Rate limits on feed, lazy-refresh, generate | P0 | Pool + abuse protection |
| 3 | Minimal job queue for ingest / lazy-refresh | P0 | Remove sync work from HTTP |
| 4 | Split `ScriptGeneratorSection` + dynamic import scripts tab | P0 | Reduce bundle / regression radius |
| 5 | Cap script chat history sent to DeepSeek | P1 | Cost + latency |
| 6 | Prisma/Supabase pool runbook in docs | P1 | P2024, feed p95 |
| 7 | Remove or replace `mockWeeklyTrends` | P1 | Home tab credibility |
| 8 | `withApiRoute` on feed, transcribe, generate | P1 | One route per week + smoke test |
| 9 | Consolidate saved map + list client fetches | P1 | Fewer duplicate calls |
| 10 | Document `DashboardTabPanel` mount policy; audit `active` guards | P1 | Background request waste |

## Backlog (Important / Later)

**Important (P1):** Split `CompetitorSpySection`; bounded cleanup for `appRuntimeState` keys; `maxDuration` on generate route.

**Later (P2+):** Unified API error shape migration; repository layer; ISR for static shell; HTTP cache headers on GET APIs; DeepSeek streaming; OpenTelemetry.

## Explicitly not planned here

Items listed under «Later (not now)» in `docs/BACKEND_ARCHITECTURE.md` remain deferred unless product asks.

## How to update this file

1. Move completed items to **Completed** with date.
2. Add new items only when decided — link to `02-change-log.md` for shipped work.
3. Do not duplicate full audit prose — point to `06-audits.md`.
