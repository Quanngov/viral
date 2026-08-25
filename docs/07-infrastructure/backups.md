# Backups

## Database

Primary data: PostgreSQL on Supabase.

**Не определено в текущем проекте:**
- Backup schedule
- Point-in-time recovery configuration
- Backup retention policy
- Restore runbook

Supabase provides platform-level backups when used as hosted Postgres — **not configured or documented in this repository**.

## Legacy SQLite

- File: `prisma/dev.db`
- Purpose: legacy / migration source only
- Not used at runtime

Migration script: `npm run migrate:sqlite-to-supabase`

## Application state

Non-DB runtime state:
- `AppRuntimeState` table (throttle keys, KV)
- Client `sessionStorage` caches (ephemeral)

## OAuth tokens

Encrypted in `UserSocialOAuthCredential`. Loss of `AUTH_SECRET` / `SOCIAL_OAUTH_ENCRYPTION_KEY` makes tokens unrecoverable.

## Связанные документы

- [[database]]
- [[infrastructure]]
- [[deployment]]
