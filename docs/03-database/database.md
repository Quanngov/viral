# Database

> PostgreSQL via Prisma 6. Schema: [[schema]].

## Connection

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App runtime (Supabase pooler, port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Migrations / `prisma db push` (direct port 5432) |

Provider: `postgresql` in `prisma/schema.prisma`.

## Client access

- `src/lib/prisma.ts` — extended client (Sentry on errors)
- `src/lib/prisma-base.ts` — base singleton
- `src/lib/prisma-sequential.ts` — sequential query helper for pool protection

## Legacy

- `prisma/dev.db` (SQLite) — **not runtime**; migration/backup only
- Script: `npm run migrate:sqlite-to-supabase`

## Domain groupings

| Domain | Models |
|--------|--------|
| Content | `Video`, `SearchCache`, `TrendItem`, `SearchQueryLog` |
| User app | `SessionUser`, `SavedVideo`, `ScriptChat`, `ScriptMessage`, `ScriptChatReference`, `ScriptUserProfile` |
| Auth (NextAuth) | `User` (mapped `AuthUser`), `Account`, `Session`, `VerificationToken` |
| Competitors | `CompetitorAccount`, `CompetitorVideo`, `CompetitorDailySync` |
| Billing | `UserTokenBalance`, `TokenTransaction`, `UserSubscription`, `BillingOrder`, `AuthBillingGrant` |
| Profile / Social | `UserOnboardingProfile`, `UserSocialAccount`, `UserSocialOAuthCredential`, `SocialSyncJob`, `SocialSyncLog`, `SocialAccountSnapshot`, `SocialWebhookSubscription`, `SocialWebhookEvent`, `UserProfileAiAnalysis` |
| Ops | `AdminEvent`, `AppRuntimeState` |

## Indexes (notable)

- `Video`: `[durationSeconds, views, score, viralScore]` — home feed
- `SocialSyncJob`: `[status, scheduledFor, priority]`
- `UserSocialAccount`: `[syncStatus, nextSyncAt]`, unique `[userId, platform]`

## Pool considerations

- Supabase free-tier pool limits documented in audit
- Circuit breaker on `AdminEvent` writes when P2024 pool errors
- Staggered client fetches reduce concurrent connections

## Связанные документы

- [[schema]]
- [[migrations]]
- [[backend]]
- [[infrastructure]]
