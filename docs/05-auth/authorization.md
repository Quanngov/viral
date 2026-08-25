# Authorization

> Access control patterns in code. No centralized middleware — per-route checks.

## Session requirement

Most user API routes call `ensureSessionUser()` — returns `{ userId, sessionKey }` or creates anonymous user.

Routes without session: public config endpoints, OAuth callbacks, webhooks (platform-specific), health checks.

## Admin access

| Mechanism | Env |
|-----------|-----|
| Query key | `ADMIN_SECRET` |
| Header | `Authorization: Bearer {ADMIN_SECRET}` |

Protected:
- `/admin`, `/admin/[section]`
- `/api/admin/*` (via `admin-auth.ts`)

Some cron routes accept `ADMIN_SECRET` as fallback: `/api/cron/social-sync`.

## Cron authorization

| Route | Auth |
|-------|------|
| `POST /api/cron/social-sync` | `CRON_SECRET` or `ADMIN_SECRET` (Bearer or `?key=`) |
| `POST /api/videos/thumbnail-cleanup` | `CRON_SECRET` |

If secret unset in non-production: cron routes may allow access (`NODE_ENV !== "production"`).

## Billing gates

Plan features: `src/lib/profile/profile-plan-features.ts`

Examples:
- AI profile analysis: PRO+ only (`aiProfileAnalysis`)
- Competitor limits: per plan in `billing.config.ts`

Token spend: routes return **402** when insufficient balance.

## Order confirm

`POST /api/billing/orders/[orderId]/confirm` — requires `ADMIN_SECRET` (manual payment confirmation).

## Social sync admin

`GET /api/admin/social` — admin secret required in production.

## Rate limiting

Social sync internal rate limiter: `src/lib/social-sync/rate-limiter.ts` (provider API calls).

**Не определено в текущем проекте:** global per-IP rate limits on feed/generate routes.

## Связанные документы

- [[authentication]]
- [[features]]
- [[backend]]
