# Migrations

> Prisma migrations in `prisma/migrations/`. Apply: `npx prisma migrate dev`.

## Migration history (chronological)

| Migration | Description |
|-----------|-------------|
| `20260507231352_init` | Initial schema |
| `20260507233752_video_scoring_columns` | Video scoring fields |
| `20260508001211_add_video_niche` | Video niche |
| `20260512120000_video_external_multiplatform` | Multi-platform video |
| `20260512140000_token_wallet_models` | Token wallet |
| `20260512160000_admin_event` | AdminEvent |
| `20260512190000_saved_video` | SavedVideo |
| `20260513120000_competitor_ig_pagination` | IG pagination token on competitors |
| `20260514120000_competitor_per_user_daily` | Daily sync per user |
| `20260515120000_script_generator_models` | Script generator |
| `20260515140000_script_profile_text` | Script profile text field |
| `20260516120000_video_transcript_columns` | Transcript on Video |
| `20260516200000_competitor_video_transcribe_fields` | Competitor video transcript fields |
| `20260516210000_script_chat_reference` | ScriptChatReference |
| `20260531120000_billing_monetization` | Billing plans, orders, subscription |
| `20260531140000_auth_billing_grant` | AuthBillingGrant (one-time grants per auth user) |
| `20260705120000_user_onboarding_profile` | UserOnboardingProfile |
| `20260705120000_social_oauth_integration` | Social OAuth models |
| `20260705140000_profile_hub` | Profile hub extensions |
| `20260705160000_social_sync_engine` | Sync jobs, logs, snapshots, webhooks |

## Commands

```bash
npx prisma generate          # postinstall
npx prisma migrate dev       # local dev
npx prisma migrate deploy    # production (не определено в CI конфиге репозитория)
npx prisma db push           # uses DIRECT_URL
```

## Legacy SQLite

- `prisma/dev.db` — not used at runtime
- `npm run migrate:sqlite-to-supabase` — one-time migration script

## Связанные документы

- [[database]]
- [[schema]]
