# Deployment

## Local development

From `README.md` and `project-docs/00-project-overview.md`:

```bash
npm install
npx prisma generate
npx prisma migrate dev
cp .env.example .env   # fill secrets
npm run dev            # http://localhost:3000
```

Build:

```bash
npm run build
npm run start
```

## Hosting assumptions (from code)

| Signal | Implication |
|--------|-------------|
| `VERCEL_URL` in `social-sync-service.ts` | Vercel deployment supported |
| `next start` script | Node server deployment supported |
| No Dockerfile in repo | Container deploy not documented |

**Не определено в текущем проекте:**
- Production URL / domain
- Vercel project config (`vercel.json` absent)
- GitHub Actions / CI workflows
- Staging environment
- Environment promotion process

## Database migrations (production)

Prisma command: `npx prisma migrate deploy`

**Не определено в текущем проекте:** automated migration on deploy.

## Cron jobs

| Job | Route | Trigger |
|-----|-------|---------|
| Social sync | `POST /api/cron/social-sync` | External cron required |
| Thumbnail cleanup | `POST /api/videos/thumbnail-cleanup` | `CRON_SECRET` |

**Не определено в текущем проекте:** scheduled cron configuration (Vercel Cron, etc.).

## Sentry source maps

Optional CI upload via `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.

## OAuth redirect URIs (production)

Must register in provider consoles:
- `{origin}/api/social/oauth/youtube/callback`
- `{origin}/api/social/oauth/instagram/callback`
- `{origin}/api/social/oauth/tiktok/callback`
- NextAuth callback: `{AUTH_URL}/api/auth/callback/google`

Override via `*_OAUTH_REDIRECT_URI` env vars.

## Связанные документы

- [[infrastructure]]
- [[authentication]]
- [[instagram]]
- [[youtube]]
