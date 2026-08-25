# Authentication

> NextAuth v5 + app session model.

## Providers

Configured in `src/auth.ts`:

| Provider | Env |
|----------|-----|
| Google OAuth | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| Credentials (email/password) | stored `passwordHash` on `User` |

NextAuth config:
- `session.strategy`: **JWT** (maxAge 30 days)
- `adapter`: PrismaAdapter on `prisma`
- `trustHost`: `AUTH_TRUST_HOST === "true"`
- `secret`: `AUTH_SECRET`
- Sign-in page: `/`
- Google: `allowDangerousEmailAccountLinking: true`

## Dual identity model

| Layer | Model | Purpose |
|-------|-------|---------|
| Auth.js | `User` (`AuthUser` table) | OAuth accounts, email |
| App | `SessionUser` | Tokens, saved videos, chats, social accounts |

**Bridge:** `src/lib/auth-bridge.ts` — on sign-in, links `authUserId` to existing or new `SessionUser`.

## Anonymous sessions

- Cookie: `viral_session_id` (httpOnly, sameSite lax, maxAge ~400 days)
- Created in `ensureSessionUser()` when no NextAuth session
- `SessionUser.sessionKey` matches cookie UUID

## API session entry

`ensureSessionUser()` in `src/lib/session-user.ts`:

1. Try `auth()` → link to `SessionUser`
2. Else read/create cookie → find or create `SessionUser` by `sessionKey`
3. Calls `ensureBillingForUser(userId)`

Used by most authenticated API routes.

## Registration

- `POST /api/auth/register` — creates `User` with password hash
- NextAuth route: `/api/auth/[...nextauth]`

## Social OAuth (separate from login)

Platform connect for Profile Hub uses **different** OAuth flows:
- `/api/social/oauth/[platform]/start|callback`
- State signed via `src/lib/social-sync/oauth-state.ts`
- Secrets: `SOCIAL_OAUTH_STATE_SECRET` or `AUTH_SECRET`

This is **not** NextAuth provider login — it connects social accounts to `UserSocialAccount`.

## Token encryption (social OAuth)

`src/lib/social-sync/token-crypto.ts`:
- AES-256-GCM
- Key: `SOCIAL_OAUTH_ENCRYPTION_KEY` → `AUTH_SECRET` fallback

## Связанные документы

- [[authorization]]
- [[instagram]]
- [[youtube]]
- [[database]]
