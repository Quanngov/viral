# Current Status

> **Дата анализа:** 2026-08-15  
> Источники: код репозитория, `docs/project-audit-master.md` (2026-05-30), незакоммиченные изменения в ветке (social sync, profile hub, dashboard home).

## Stack (фактический)

| Компонент | Версия / технология |
|-----------|---------------------|
| Framework | Next.js 16.2.6 (App Router) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| ORM | Prisma 6.16, PostgreSQL (Supabase) |
| Auth | NextAuth v5 beta (`next-auth@5.0.0-beta.31`) |
| Observability | Sentry (`@sentry/nextjs`), `AdminEvent`, stdout (`server-log.ts`) |
| AI | DeepSeek API (script generator) |
| Transcription | Groq Whisper (fallback) |

## Что работает

### Core dashboard

- **Home / Search** — `POST /api/videos/feed`: выбор из БД + опциональный ingest YouTube Data API и TikHub Instagram
- **Search UI** — heading "Поиск видео" (aligned with "Тренды в реальном времени"), popular-query chips (random subset per load, no auto-rotation, single row with only fully-fitting chips), slow animated placeholder; popular queries из `SearchQueryLog` (SSR `popularSearchTopics`) + fallback
- **Saved videos** — `/api/saved-videos`, контекст `SavedVideosProvider`
- **Competitors** — CRUD `/api/competitors/*`, daily sync, TikHub reels для Instagram
- **Live trends** — `GET /api/trends/realtime` (poll), `POST /api/trends/lazy-refresh`
- **Script generator** — чаты, references, `POST /api/script-generator/generate` → DeepSeek; refund токенов при ошибке
- **Transcription** — `POST /api/videos/transcribe` (subtitles + Groq fallback)
- **SSR home** — `fetchDashboardInitialPayload()` на `/`

### Auth & billing

- NextAuth: Google OAuth + credentials (email/password)
- Dual identity: `User` (Auth.js) + `SessionUser` (app data), bridge через `auth-bridge.ts`
- Anonymous usage через httpOnly cookie `viral_session_id`
- Token wallet + ledger (`UserTokenBalance`, `TokenTransaction`)
- Plans: FREE, TRIAL, PRO, BUSINESS; token packs; `/api/billing/*`, UI `/billing`
- Account panel (modal) with summary header (balance, plan, CTA, spent/granted) + tabs; billing stats reused from `/api/billing/me`
- Account rail: balance as "X / total" + 2-segment scale + upgrade CTA (FREE→PRO, PRO→BUSINESS); settings in nav under Профиль
- Promo: once-per-day top header + first-position feed card (upgrade −30% или token-pack). Оффер в премиальном графитово-золотом стиле; цены из `billing.config.ts`; состояние показа привязано к пользователю (`viral:promo:v2:<scope>`), upgrade/buy через существующий `viral:open-account` → `AccountPanel`. Для неавторизованных вместо рекламного оффера — регистрационный хедер и карточка («Пробный режим» → «Регистрация» через `useAuthGate().openAuth`); гостей определяет существующая сессия (`useAuthDisplay().showGuest`), без localStorage. UI-only, без нового checkout.
- Заказы в `BillingOrder`; confirm через admin — **платёжный провайдер (YooKassa/Stripe) не подключён в коде**

### Profile Hub & Dashboard Home (новое)

- **Profile Hub** — `UserOnboardingProfile`, `UserSocialAccount`, UI `ProfileHub`
- **Dashboard Home overview** — activity rings, social cards, AI tasks (`/api/user/dashboard/home`)
- **Manual social accounts** — username без OAuth через onboarding profile
- **AI profile analysis** — API stub: создаёт `UserProfileAiAnalysis` со status `pending`; **генерация отчёта не реализована** (комментарий в route)

### Social Sync Engine (новое)

Единый путь: `src/lib/social-sync/` → `SocialSyncService` → providers.

| Platform | OAuth connect | Sync | Webhooks | Статус |
|----------|---------------|------|----------|--------|
| **YouTube** | Google OAuth (`GOOGLE_CLIENT_*`) | profile, videos, analytics | нет (polling) | **Работает** (по истории разработки) |
| **Instagram** | Facebook Login → Graph API (`META_APP_*`) | profile, videos; insights отключены | нет (polling) | **OAuth проходит; известная проблема: `GET /me/accounts` возвращает пустой массив** |
| **TikTok** | TikTok Login Kit (`TIKTOK_CLIENT_*`) | provider реализован | webhooks в capabilities | **Не определено в текущем проекте** (E2E не подтверждён в docs) |

Дополнительно:
- OAuth routes: `/api/social/oauth/[platform]/start`, `callback`
- Sync queue: `SocialSyncJob`, cron `POST /api/cron/social-sync`
- Admin: `/api/admin/social`
- Tokens encrypted: `UserSocialOAuthCredential` (AES-256-GCM, ключ из `AUTH_SECRET` / `SOCIAL_OAUTH_ENCRYPTION_KEY`)

### Admin

- `/admin?key=ADMIN_SECRET` — stats, videos, trends, billing, social sync, prompts

### Observability

- Sentry при `NEXT_PUBLIC_SENTRY_DSN`
- AdminEvent с circuit breaker на pool errors
- Perf audit hooks: `PERF_AUDIT`, `PERF_TRACE` env flags

## В разработке / частично

- **Instagram OAuth → Page → IG Business** — диагностика empty `/me/accounts` (временные логи в `instagram-provider.ts`)
- **AI profile analysis** — только queue record, без генерации report
- **Social sync cron** — route есть; **расписание cron в репозитории не определено** (нет vercel.json / GitHub Actions)
- **TikTok OAuth connect** — provider code exists, production readiness не подтверждён
- **Rate limits / job queue** для feed ingest — в roadmap audit, не реализовано

## Не реализовано

- Платёжный провайдер (YooKassa/Stripe) — только manual confirm заказов
- DeepSeek streaming в UI script generator
- Background job queue для feed ingest / lazy-refresh (ingest всё ещё в HTTP request)
- Unified `{ success, data }` на всех API routes
- Repository layer над Prisma
- OpenTelemetry
- Юридические документы (privacy policy, GDPR) — см. [[personal-data]], [[compliance]]
- Docker / CI deployment manifests в репозитории
- `instagram_manage_insights` scope — намеренно не запрашивается (Meta permissions)

## Известные проблемы

| Проблема | Severity | Источник |
|----------|----------|----------|
| Instagram OAuth: empty `/me/accounts` | **High** (blocks IG connect) | Текущая разработка |
| Sync ingest в `POST /api/videos/feed` (latency) | Medium–High | Audit 2026-05-30 |
| UI monoliths: ScriptGeneratorSection (~1k lines), CompetitorSpySection (~1k lines) | Medium | Audit |
| ~70% API routes без `withApiRoute` | Low–Medium | Audit |
| `mockWeeklyTrends` на home | Low | Audit; panel disabled via `SHOW_WEEKLY_TRENDS_PANEL = false` |
| Supabase pool pressure под нагрузкой (P2024) | Medium | Audit |
| `src/lib/social-integration/` — legacy, **не используется** app routes | Info | Code analysis |
| Docs drift (audit dated 2026-05-30 vs social sync additions) | Info | Этот аудит |

## Интеграции (подключённые env-переменные)

См. [[infrastructure]] — полный список имён переменных.

| Интеграция | Назначение | Env |
|------------|------------|-----|
| PostgreSQL / Supabase | Primary DB | `DATABASE_URL`, `DIRECT_URL` |
| NextAuth | Login | `AUTH_*` |
| YouTube Data API | Feed search, ingest | `YOUTUBE_API_KEY` |
| Google OAuth | YouTube social connect | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Meta Graph API | Instagram social connect | `META_APP_ID`, `META_APP_SECRET` |
| TikHub | Instagram feed ingest, competitors | `TIKHUB_TOKEN` (code only, не в `.env.example`) |
| DeepSeek | Script generation | `DEEPSEEK_*` |
| Groq | Transcription fallback | `GROQ_API_KEY` (code only) |
| Sentry | Errors | `NEXT_PUBLIC_SENTRY_DSN`, … |
| TikTok Login Kit | Social connect | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` (code only) |

## API surface

**54 route handlers** в `src/app/api/**/route.ts` (на дату анализа).

## Связанные документы

- [[architecture]]
- [[roadmap]]
- [[architecture-decisions]]
- [[development-log]]
- Code audit (2026-05-30): `docs/02-architecture/code-audit-2026-05-30.md`
