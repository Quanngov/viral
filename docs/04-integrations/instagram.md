# Instagram Integration

> Два отдельных пути Instagram в проекте — не путать.

## 1. Profile Hub OAuth (Meta Graph API)

**Path:** `src/lib/social-sync/providers/instagram-provider.ts`  
**Flow:** Instagram API with **Facebook Login**

### OAuth

| Step | Endpoint |
|------|----------|
| Authorization | `https://www.facebook.com/v25.0/dialog/oauth` |
| Token exchange | `https://graph.facebook.com/v25.0/oauth/access_token` |
| Graph API | `https://graph.facebook.com/v25.0` |

### Scopes (requested)

- `instagram_basic`
- `pages_show_list`
- `pages_read_engagement`

**Not requested:** `instagram_manage_insights` (Meta app permissions limitation).

### Connect flow

1. `GET /api/social/oauth/instagram/start` → Facebook OAuth
2. Callback: `/api/social/oauth/instagram/callback`
3. Exchange code → short-lived token → long-lived user token
4. `GET /me/accounts?fields=id,name,access_token,instagram_business_account`
5. Find Page with linked IG Business/Creator account
6. Use **Page access token** for IG API calls
7. Fetch IG profile: `/{ig-user-id}?fields=username,name,profile_picture_url,followers_count,media_count`

### Environment

| Variable | Aliases |
|----------|---------|
| `META_APP_ID` | `FACEBOOK_APP_ID` |
| `META_APP_SECRET` | `FACEBOOK_APP_SECRET` |
| `META_OAUTH_REDIRECT_URI` | optional; default `{origin}/api/social/oauth/instagram/callback` |

Also uses `AUTH_SECRET` or `SOCIAL_OAUTH_ENCRYPTION_KEY` for token encryption.

### Capabilities

| Feature | Status |
|---------|--------|
| OAuth connect | Implemented |
| Profile refresh | Implemented |
| Media list (12 items) | Implemented |
| Analytics insights | **Disabled** (`analyticsInsights: false`) |
| Webhooks | **Disabled** (`webhooks: false`, polling) |
| Token refresh | Long-lived user token re-exchange + re-derive page token |

### Error handling

- Failures throw `MetaGraphError` with endpoint, HTTP status, Graph error JSON, `error.code`, `error_subcode`, `fbtrace_id`
- OAuth error page shows provider error detail (not generic `oauth_connect_failed` only)

### Known issue (2026-08)

**OAuth succeeds but `GET /me/accounts` returns empty array.**

Requirements per Meta docs:
- Instagram Professional (Business/Creator) account
- Linked to a Facebook Page
- User must grant `pages_show_list`

Temporary diagnostics logged under `[instagram.oauth.diag]`:
- `GET /me?fields=id,name`
- `GET /me/accounts?fields=id,name,tasks,instagram_business_account`
- `debug_token` summary (app_id, type, scopes, is_valid, expires_at)

### Disconnect

`DELETE /{facebook-user-id}/permissions` with user access token.

---

## 2. Feed / Competitors (TikHub)

**Path:** `src/lib/providers/tikhubInstagram.ts`  
**Purpose:** Search and ingest Instagram Reels into `Video` table for feed; competitor reels sync.

| Variable | In `.env.example` |
|----------|-------------------|
| `TIKHUB_TOKEN` | **No** (code only) |

Base URL: `api.tikhub.io`

Used by:
- `POST /api/videos/feed` (Instagram ingest branch)
- `/api/competitors/[competitorId]/reels`
- `competitor-daily-sync.ts`

This path is **independent** of Meta OAuth / Profile Hub.

---

## Legacy (unused)

`src/lib/social-integration/providers/instagram.ts` — not imported by app routes. Superseded by `social-sync`.

## Admin

- `GET /api/admin/social` — social sync admin summary
- `GET /api/admin/instagram-thumbnails/debug` — thumbnail debug

## Связанные документы

- [[youtube]]
- [[authentication]]
- [[backend]]
- [[current-status]]
- [[architecture-decisions]]
