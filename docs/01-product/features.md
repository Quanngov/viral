# Features

> Фактические возможности по коду. Источник тарифов: `src/lib/billing/billing.config.ts`.

## Dashboard tabs

| Tab | Компонент | API |
|-----|-----------|-----|
| Home / Search | `SearchResultsSection` | `POST /api/videos/feed`, `GET /api/videos/home` |
| Competitors | `CompetitorSpySection` | `/api/competitors/*` |
| Saved | `SavedVideosSection` | `/api/saved-videos` |
| Scripts | `ScriptGeneratorSection` | `/api/script-generator/*` |
| Profile | `ProfileHub` | `/api/user/profile/hub`, social routes |

Дополнительно на home: `LiveTrendsSidebar` (poll trends), Dashboard Home overview (`DashboardHomeOverview`).

## Video search & feed

- Поиск Shorts/Reels по запросу из pooled DB + external ingest
- Платформы в feed: YouTube (`platform=youtube`), Instagram via TikHub (`platform=instagram`)
- Smart-mix batch selection, scoring (`rating`, `viralScore`)
- Token cost: SEARCH / LOAD_MORE = **5 tokens** (`BILLING_ACTION_COSTS`)
- Initial search **не списывает** tokens; `action: "more"` списывает
- External search throttle: 15 min per normalized query (`search-throttle.ts`)

## Competitors

- Добавление YouTube channels и Instagram accounts
- Daily sync с token charge (DAILY_SYNC = 5)
- ADD / REFRESH competitor = 35 tokens
- Instagram reels via TikHub pagination

## Saved videos

- Per-user saved list, import в script generator references

## Trends

- Realtime sidebar poll: `GET /api/trends/realtime` (120s interval)
- Heavy discovery: `POST /api/trends/lazy-refresh`
- Trend pool: `TrendItem` queue

## Script generator

- Multi-chat, video references with transcripts
- User script profile (`ScriptUserProfile`)
- DeepSeek generation; cost = **25 tokens** (config) или `SCRIPT_GENERATION_TOKEN_COST` env (default 20 in `.env.example` — **расхождение: canonical config = 25**)
- Refund on failure after spend

## Transcription

- `POST /api/videos/transcribe` — subtitles path + Groq Whisper fallback
- Cost: **10 tokens**

## Profile Hub

- Onboarding: niches, creator type, manual usernames (IG/TikTok/YouTube)
- OAuth connect для youtube / instagram / tiktok через [[instagram]], [[youtube]]
- Social metrics: followers, avg views, engagement, best video
- Manual refresh with cooldown (`MANUAL_REFRESH_COOLDOWN_MINUTES`)
- AI profile analysis (PRO+): **stub only** — creates pending job, no report generation

## Billing & plans

| Plan | Price/mo | Tokens | Competitors |
|------|----------|--------|-------------|
| FREE | 0 ₽ | 60 one-time | 0 |
| TRIAL | 0 ₽ · 3 days | 200 on activation | 1 |
| PRO | 2 490 ₽ | 3 000/mo | 30 |
| BUSINESS | 11 900 ₽ | 18 000/mo | 100 |

Token packs: SMALL 500 / MEDIUM 2000 / LARGE 5000 tokens.

API: `/api/billing/config`, `/me`, `/trial`, `/orders`.

## Admin

- `/admin?key=ADMIN_SECRET` — videos, trends, events, billing stats, social sync admin

## Feature flags

- `SHOW_WEEKLY_TRENDS_PANEL = false` — weekly trends panel hidden on home

## Не реализовано как product feature

- Automated payment processing
- Instagram insights (`instagram_manage_insights` not requested)
- AI profile report content generation
- Public API for third parties

## Связанные документы

- [[user-flow]]
- [[authentication]]
- [[youtube]]
- [[instagram]]
- [[ai]]
