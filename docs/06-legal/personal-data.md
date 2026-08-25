# Personal Data

> Не определено в текущем проекте как юридическая документация.

## What the application stores (factual, from schema)

| Data | Model / location |
|------|------------------|
| Email, name, avatar | `User` (Auth.js) |
| Password hash | `User.passwordHash` |
| Anonymous session ID | Cookie `viral_session_id` → `SessionUser.sessionKey` |
| Saved videos metadata | `SavedVideo` |
| Script chats and messages | `ScriptChat`, `ScriptMessage` |
| Competitor accounts | `CompetitorAccount` |
| Social profile metrics | `UserSocialAccount`, `SocialAccountSnapshot` |
| OAuth tokens (encrypted) | `UserSocialOAuthCredential` |
| Onboarding profile | `UserOnboardingProfile` |
| Billing / tokens | `UserSubscription`, `TokenTransaction`, `BillingOrder` |
| Admin audit | `AdminEvent` (may include sessionId, userId, metaJson) |

## Third-party data processors (from integrations)

| Service | Data sent |
|---------|-----------|
| Google (NextAuth, YouTube) | OAuth tokens, channel data |
| Meta (Instagram) | OAuth tokens, Page/IG profile data |
| TikTok | OAuth tokens (if connected) |
| DeepSeek | Chat messages, script profile, video reference context |
| Groq | Audio for transcription |
| TikHub | Instagram search queries, usernames |
| Sentry | Error payloads (when configured) |
| Supabase/PostgreSQL | All persisted app data |

## PII scrubbing

`admin-events.ts` includes PII scrubbing in `safeMeta()` for admin event logging.

## Privacy policy / consent UI

**Не определено в текущем проекте.**

## Связанные документы

- [[compliance]]
- [[database]]
- [[authentication]]
