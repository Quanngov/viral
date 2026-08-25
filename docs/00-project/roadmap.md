# Roadmap

> Не является commitment schedule. Обновлять при принятии решений.

## Completed

### 2026-05-30 — Performance & docs

- [x] External search throttle только после успешного ingest
- [x] Fail-open `canMakeExternalSearch` при ошибке чтения DB
- [x] Удалён `totalCount` из feed response
- [x] CodeGraph audit → `docs/02-architecture/code-audit-2026-05-30.md`

### 2026-07 — Social & Profile (по коду, без точных дат релиза)

- [x] Prisma models: `UserSocialAccount`, OAuth credentials, sync jobs/logs/snapshots
- [x] `SocialSyncService` + providers (YouTube, Instagram, TikTok)
- [x] OAuth routes `/api/social/oauth/*`
- [x] Profile Hub UI + onboarding profile
- [x] Dashboard Home overview API/UI
- [x] Billing monetization (plans, orders, trial)

## In progress / next

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | Fix Instagram `/me/accounts` empty array | P0 | Требует Meta app + Page + IG Business setup |
| 2 | Extract feed orchestration to `lib/feed/*` | P0 | Stable JSON contract |
| 3 | Rate limits on feed, lazy-refresh, generate | P0 | Pool + abuse |
| 4 | Minimal job queue for ingest / lazy-refresh | P0 | Remove sync from HTTP |
| 5 | Split ScriptGeneratorSection + dynamic import | P0 | Bundle size |
| 6 | Cap script chat history for DeepSeek | P1 | Cost + latency |
| 7 | AI profile analysis generation | P1 | Stub exists |
| 8 | Payment provider (YooKassa/Stripe) | P1 | Orders exist, confirm manual |
| 9 | Cron schedule for social-sync | P1 | Route exists |
| 10 | `withApiRoute` on critical routes | P1 | feed, transcribe, generate |

## Backlog (from audit)

- Split `CompetitorSpySection`
- Bounded cleanup `appRuntimeState` keys
- `maxDuration` on generate route
- Unified API error shape (phased)
- Repository layer
- DeepSeek streaming
- OpenTelemetry

## Explicitly deferred

См. [[backend]] — секция «Later (not now)» из guardrails.

## Связанные документы

- [[current-status]]
- [[architecture-decisions]]
- [[development-log]]
- Pricing models: `project-docs/pricing/` (unit economics, не product roadmap)
