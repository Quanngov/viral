# Infrastructure

> Объединяет `project-docs/04-services-and-integrations.md`.

## Runtime

| Component | Technology |
|-----------|------------|
| App server | Next.js (`npm run dev` / `next start`) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Error tracking | Sentry (optional) |

**Не определено в текущем проекте:**
- Docker / docker-compose
- Kubernetes manifests
- Terraform / IaC
- CI/CD pipeline config in repo

## Environment variables (names only)

### Auth

- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

### Database

- `DATABASE_URL`
- `DIRECT_URL`

### YouTube

- `YOUTUBE_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

### Meta / Instagram

- `META_APP_ID`, `META_APP_SECRET`
- `META_OAUTH_REDIRECT_URI`
- Aliases: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`

### TikTok

- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` (code only)
- `TIKTOK_OAUTH_REDIRECT_URI`

### AI

- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`
- `SCRIPT_GENERATION_TOKEN_COST`
- `GROQ_API_KEY`, `GROQ_WHISPER_MODEL` (code only)

### Third-party (code only, not all in `.env.example`)

- `TIKHUB_TOKEN`

### Social OAuth crypto

- `SOCIAL_OAUTH_ENCRYPTION_KEY`
- `SOCIAL_OAUTH_STATE_SECRET`

### App URL

- `NEXT_PUBLIC_APP_URL`
- `VERCEL_URL` (auto on Vercel)

### Admin / Cron

- `ADMIN_SECRET`
- `CRON_SECRET`

### Sentry

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ENABLED`
- `SENTRY_ENVIRONMENT`
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

### Performance debug

- `PERF_AUDIT`
- `PERF_TRACE`
- `PERF_PRISMA_SLOW_MS`

### Node

- `NODE_ENV`

## External services map

```
Browser → Next.js
  → PostgreSQL (Prisma)
  → YouTube Data API
  → Google OAuth / YouTube OAuth
  → Meta Graph API (Instagram)
  → TikTok Open API
  → TikHub (Instagram feed/competitors)
  → DeepSeek (scripts)
  → Groq (transcription)
  → Sentry (errors)
```

## Observability

- **stdout:** `server-log.ts` (always)
- **AdminEvent:** DB audit with circuit breaker
- **Sentry:** production or `SENTRY_ENABLED=true`
- **Admin health:** `GET /api/admin/health` — checks env presence for tikhub, youtube, deepseek, groq, database

## Health / ops scripts

- `scripts/seed-youtube.ts`
- `scripts/migrate-sqlite-to-supabase.ts`
- `scripts/perf-audit.mjs`, `scripts/perf-query-trace.mjs`
- `scripts/test-instagram-lifecycle.ts`
- `scripts/visual-dashboard-home.mjs`

## Связанные документы

- [[deployment]]
- [[backups]]
- [[backend]]
