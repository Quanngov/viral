# Services & Integrations

> From `.env.example` and code references. Variables not in `.env.example` but used in code are marked **(code only)**.

## Database — Supabase / PostgreSQL

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App runtime (pooler, port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Migrations / `prisma db push` (direct port 5432) |

Client: Prisma 6. Legacy SQLite `prisma/dev.db` — not runtime.

## Auth — NextAuth v5

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | Session signing |
| `AUTH_URL` | e.g. `http://localhost:3000` |
| `AUTH_TRUST_HOST` | `true` for dev/proxy |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |

Providers: Google (with email linking), credentials (email/password via `passwordHash` on `User`).

## YouTube Data API

| Variable | Purpose |
|----------|---------|
| `YOUTUBE_API_KEY` | Search + video details |

Used in: `src/lib/youtube.ts`, `src/lib/feed/ingest-youtube.ts`, `src/app/api/youtube/search/route.ts`, feed ingest branch.

Also caches in Prisma `SearchCache` (12h TTL) on `GET /api/youtube/search` — separate from main feed search path.

## TikHub — Instagram

| Variable | Purpose |
|----------|---------|
| `TIKHUB_TOKEN` | **(code only)** — Bearer for TikHub API |

Used in: `src/lib/providers/tikhubInstagram.ts`, feed Instagram ingest, competitor reels sync.

Base URLs (from code): `api.tikhub.io` — search reels, user reels, post info.

## DeepSeek — Script generation

See `project-docs/03-ai-prompts.md`.

## Groq — Transcription (Whisper)

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | **(code only)** — fallback transcription |

Used in: `src/app/api/videos/transcribe/route.ts` (120s fetch timeout). Primary path may use subtitles when available.

## Sentry

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Error reporting |
| `SENTRY_ENABLED` | Force on in dev |
| `SENTRY_ENVIRONMENT` | Environment tag |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Source maps upload (CI) |

## Admin

| Variable | Purpose |
|----------|---------|
| `ADMIN_SECRET` | `/admin?key=...` and `/api/admin/*` |

## Internal token economy

- Default balance on new `SessionUser`: 12_400 (`token-wallet.ts`)
- Feed “show more”: 5 tokens default (`TOKEN_COST` in feed route)
- Script generation: `SCRIPT_GENERATION_TOKEN_COST` (default 20)
- Competitor Instagram reels refresh: 30 tokens (`competitors/[competitorId]/reels/route.ts`)

## External dependency map

```
Browser
  → Next.js API routes
       → PostgreSQL (Prisma)
       → YouTube Data API (feed ingest, youtube/search)
       → TikHub (Instagram search, competitor reels)
       → DeepSeek (script generate)
       → Groq (transcribe fallback)
       → Sentry (errors)
```
