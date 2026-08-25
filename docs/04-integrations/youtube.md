# YouTube Integration

> Два отдельных пути YouTube в проекте.

## 1. YouTube Data API (feed / search)

**Purpose:** Discover and ingest YouTube Shorts into `Video` table.

| Variable | Purpose |
|----------|---------|
| `YOUTUBE_API_KEY` | Server-side API key |

### Code paths

- `src/lib/youtube.ts`
- `src/lib/feed/ingest-youtube.ts`
- `src/app/api/videos/feed/route.ts` — ingest branch
- `src/app/api/youtube/search/route.ts` — standalone search with `SearchCache` (12h TTL)
- `src/app/api/trends/lazy-refresh/route.ts`
- `competitor-daily-sync.ts` — YouTube competitor sync

### Feed behavior

- Parallel ingest with TikHub Instagram when pool low
- Throttled via `search-throttle.ts` (15 min per query after successful save)

---

## 2. Profile Hub OAuth (YouTube channel connect)

**Path:** `src/lib/social-sync/providers/youtube-provider.ts`

| Variable | Aliases |
|----------|---------|
| `GOOGLE_CLIENT_ID` | `YOUTUBE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | `YOUTUBE_CLIENT_SECRET` |
| `GOOGLE_OAUTH_REDIRECT_URI` | optional; default `{origin}/api/social/oauth/youtube/callback` |

### OAuth endpoints

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- API: `https://www.googleapis.com/youtube/v3`

### Scopes (from oauth-error-response config)

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/userinfo.profile`

### Connect flow

1. `GET /api/social/oauth/youtube/start`
2. Callback → exchange code → fetch channel → store tokens encrypted
3. `SocialSyncService` enqueues initial sync

### Sync capabilities

- Profile: channel snippet + statistics
- Videos: recent uploads playlist
- Analytics: estimated monthly views from recent video stats
- Update strategy: **polling** (no webhooks)

### Status

YouTube OAuth connect **работает** (per development history in [[current-status]]).

---

## Competitors (YouTube)

- Add by channel URL/ID → `CompetitorAccount`
- Sync via YouTube Data API + `YOUTUBE_API_KEY`
- Not the same as Profile Hub OAuth (separate competitor tracking)

## Scripts

- `npm run seed:youtube` — `scripts/seed-youtube.ts`

## Связанные документы

- [[instagram]]
- [[backend]]
- [[features]]
