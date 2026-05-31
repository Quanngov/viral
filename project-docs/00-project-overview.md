# Viral — Project Overview

> Single source of truth entry point. Last updated: 2026-05-30.

## What this is

**Viral** is a Next.js dashboard for discovering short-form videos (YouTube Shorts, Instagram Reels), tracking competitors, saving videos, viewing live trends, and generating scripts via DeepSeek.

- **Runtime:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** PostgreSQL (Supabase) via Prisma 6
- **Auth:** NextAuth v5 (JWT) + app `SessionUser` + cookie bridge
- **Monetization:** Internal token wallet (`UserTokenBalance`)

## Repository map

| Path | Purpose |
|------|---------|
| `src/app/page.tsx` | SSR home → `HomeDashboard` |
| `src/app/home-dashboard.tsx` | Dashboard shell, tabs, providers |
| `src/app/api/**` | 34 API route handlers |
| `src/lib/**` | Domain logic, ingest, tokens, trends, AI |
| `src/components/dashboard/**` | Dashboard UI (intentionally stable layout) |
| `prisma/schema.prisma` | Postgres schema |
| `docs/BACKEND_ARCHITECTURE.md` | Backend guardrails (canonical for API/Prisma edits) |
| `docs/project-audit-master.md` | Full CodeGraph audit (2026-05-30) |
| `project-docs/` | This knowledge base |

## Main user flows

1. **Home / Search** — `SearchResultsSection` → `POST /api/videos/feed` (DB pick + optional YouTube/TikHub ingest)
2. **Competitors** — `CompetitorSpySection` → `/api/competitors/*`
3. **Saved** — `SavedVideosContext` → `/api/saved-videos`
4. **Scripts** — `ScriptGeneratorSection` → `/api/script-generator/*` + DeepSeek
5. **Trends** — `LiveTrendsSidebar` polls `GET /api/trends/realtime`; heavy refresh via `POST /api/trends/lazy-refresh`

## Dev commands

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev          # http://localhost:3000
npm run build
npm run seed:youtube
```

## Related docs

- Backend rules: `docs/BACKEND_ARCHITECTURE.md`
- Agent rules: `AGENTS.md`
- Audits: `project-docs/06-audits.md`, `docs/project-audit-master.md`

## Viewing the knowledge dashboard

Open **`project-docs/dashboard.html`** directly in a browser (no server):

```
file:///.../viral/project-docs/dashboard.html
```

Markdown files are the source of truth. After editing them, regenerate the dashboard:

```bash
node project-docs/build-dashboard.mjs
```

