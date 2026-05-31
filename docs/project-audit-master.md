# Viral Project Audit

> **Источник:** объединение двух аудитов на базе CodeGraph (Complexity Audit + Architecture Audit).  
> **Дата сводки:** 30 мая 2026.  
> **Индекс на момент анализа:** 159 файлов, 34 API routes, 2 113 символов, 4 007 рёбер.

---

## Executive Summary

### Текущее состояние

Viral — Next.js-приложение с дашбордом для поиска коротких видео (YouTube / Instagram), конкурентов, сохранённых роликов, трендов и генератора сценариев на DeepSeek. Бэкенд: **PostgreSQL (Supabase)** через Prisma; сессии и токены — через `SessionUser` + cookie, с мостом к NextAuth. Архитектура документирована в `docs/BACKEND_ARCHITECTURE.md`: routes → `src/lib/*` → Prisma.

Продукт **функционально зрелый для MVP/раннего production**: есть SSR первого экрана, клиентский кэш, throttling внешних API, observability (admin events, Sentry), экономика токенов с refund при ошибках AI.

### Сильные стороны

- Осознанная защита Supabase pool (staggered fetch, read-only trends poll, circuit breaker на AdminEvent).
- Клиентский stale-while-revalidate с dedupe (`client-fetch-cache`, `dashboard-fetch`).
- Чёткий auth-bridge: аноним → залогиненный пользователь без потери `SessionUser`.
- Hub-модули `token-wallet` и `admin-events` централизуют биллинг и аудит.
- Script Generator: server-only промпты, refund токенов при сбое DeepSeek.

### Слабые стороны

- «Толстые» route handlers и UI-монолиты (feed 416 строк, ScriptGeneratorSection ~1 091, CompetitorSpySection ~1 023).
- Тяжёлая работа (ingest, lazy-refresh) в HTTP-запросе, без очереди фоновых задач.
- Три слоя кэша без единой модели; ~70% API routes без `withApiRoute`.
- Все вкладки дашборда остаются смонтированными (`hidden`), не lazy-loaded.
- Документация отстаёт от кода (NextAuth уже в `ensureSessionUser`, в docs — «ещё нет»).

### Уровень готовности продукта

| Область | Оценка |
|--------|--------|
| **MVP / early prod** | Готов при умеренной нагрузке и ручном мониторинге |
| **Масштаб без доработок** | Ограничен (pool DB, sync ingest, монолитный UI) |
| **Enterprise-ready** | Нет — нужны очереди, rate limits, декомпозиция |

**Итог:** сильный **операционный инженерный слой** при **монолитной структуре** кода; подходит для запуска и итераций, но требует целенаправленного hardening перед ростом трафика.

---

## Architecture Review

### Dashboard

#### Strengths

- SSR: `page.tsx` → `fetchDashboardInitialPayload()` — параллельно home + trends.
- Провайдеры: `AuthSessionProvider` → `ToastProvider` → `SavedVideosProvider` → layout.
- Tab routing через URL (`dashboard-tab-url`); `DashboardTabPanel` сохраняет scroll/state.
- Защита pool: отложенная загрузка saved map (12 s) / list (18 s).
- `LiveTrendsSidebar`: один активный poller (desktop *или* mobile), 120 s, visibility-aware.

#### Weaknesses

- `home-dashboard.tsx` — hub с fan-out 18 (импорт почти всех секций).
- Все вкладки смонтированы, включая Script Generator и Competitor Spy (~2 k+ строк UI в дереве).
- `mockWeeklyTrends` на home tab — mock в prod-пути.
- Нет code splitting по вкладкам.

#### Risks

- Новые `useEffect` в неактивных вкладках без проверки `active` → лишние запросы.
- Дублирование `LiveTrendsSidebar` в DOM (desktop + mobile), mitigated через `shouldFetch`.
- `force-dynamic` на `/` — каждый визит бьёт в БД для SSR.

---

### Auth

#### Strengths

- NextAuth (JWT) + `SessionUser` + `auth-bridge` (link anonymous cookie → `authUserId`).
- `ensureSessionUser()` — единая точка входа для API (auth сначала, иначе cookie).
- httpOnly cookie `viral_session_id`, транзакции при создании пользователя и баланса.

#### Weaknesses

- Два Prisma-клиента (`prisma-base` для Auth adapter, extended `prisma` для app) → два pool.
- Нет централизованного API middleware; каждый route повторяет session/tokens.
- `allowDangerousEmailAccountLinking: true` для Google.
- Docs: «not NextAuth yet in routes» — устарело.

#### Risks

- Race / edge cases при одновременном cookie и JWT до завершения bridge.
- Cookie maxAge ~400 дней — длинная анонимная сессия.
- Расхождение identity при ошибке `linkAuthUserToSessionUser` в `events.signIn`.

---

### Script Generator

#### Strengths

- REST: chats, references, profile, `POST generate`.
- `deepseek-generate.ts` — typed errors, 60 s timeout, server-only prompts.
- `spendTokens` → при ошибке DB/DeepSeek → `creditTokens` (refund).
- Admin events + Sentry на AI path.

#### Weaknesses

- UI-монолит `ScriptGeneratorSection.tsx` (~1 091 строк, state rank #3).
- `generate/route.ts` без `withApiRoute`; загружает **полную** историю чата на каждую генерацию.
- Route не задаёт `maxDuration` (в отличие от trends realtime).

#### Risks

- Рост стоимости и latency с длиной чата (DB + prompt tokens).
- Blocking serverless до 60 s на generate.
- Регрессии UI затрагивают весь сценарный продукт одним файлом.

---

### Cache Layer

#### Strengths

- `cachedFetch`: memory SWR, sessionStorage, in-flight dedupe, `revalidate: false` для load shedding.
- `seedDashboardFromSsr` — согласование SSR и клиента.
- Ключи в `CACHE_KEYS` для home, trends, tokens, saved, competitors.

#### Weaknesses

- Три системы: client cache, DB `SearchCache`, `appRuntimeState` KV.
- Два запроса к `/api/saved-videos` (map + list).
- Нет HTTP cache headers на API.

#### Risks

- Инвалидация не той layer → stale saved state / trends.
- `sessionStorage` quota — silent fail при переполнении.

---

### Prisma

#### Strengths

- Один schema, PostgreSQL, `directUrl` для миграций.
- Singleton + hot-reload safe; extension → Sentry (кроме AdminEvent).
- Query modules: `dashboard-home`, `dashboard-trends`.
- Индексы на feed (`durationSeconds`, `views`, `score`).

#### Weaknesses

- Fat routes: feed, competitors, competitor-daily-sync.
- Нет repository layer; Prisma вызовы размазаны.
- `appRuntimeState` как unbounded KV (`external_search_${query}`).

#### Risks

- Рост таблицы `Video` → тяжелее feed pick и trend pool scan.
- Pool exhaustion при пиках (P2024) → circuit breaker отключает AdminEvent DB writes.

---

### Supabase

#### Strengths

- Явная забота о free-tier pool (stagger, consoleOnly на hot paths, read-only realtime).
- Legacy SQLite (`prisma/dev.db`) не в runtime.

#### Weaknesses

- Всё request-driven; нет cron/queue на стороне Supabase для ingest/sync.
- Два Prisma client на инстанс.

#### Risks

- Connection pool timeout под concurrent search + lazy-refresh + logging.
- Нет documented pool sizing / PgBouncer strategy в repo.

---

### Performance

#### Strengths

- External search throttle 15 min/query.
- Feed batch = 8, smart-mix, parallel YT+IG ingest только при условиях.
- Trends: GET read-only; тяжёлое — `lazy-refresh` POST с session gate 15 min.
- `withTimedRoute` на trends realtime (log if dbMs ≥ 200).

#### Weaknesses

- Sync ingest в `POST /api/videos/feed`.
- Client-triggered `lazy-refresh` без per-user rate limit.
- SSR dynamic на каждый home visit.

#### Risks

- Feed POST — главный latency и timeout bottleneck.
- AdminEvent verbose logging на feed path (DB pressure).
- Hidden-mounted tabs — лишняя память и потенциальные effects.

---

## Most Complex Files

Метрики CodeGraph: **deps** (imports), **fan-in** (внешние callers), **fan-out** (внешние callees), **state** (property/variable/constant nodes).  
Сортировка: от **наибольшего регрессионного / продуктового риска** к меньшему.

| File | Complexity | Risk | Why |
|------|------------|------|-----|
| `src/app/api/videos/feed/route.ts` | deps **20** (#1), fan-out **17**, fan-in **9**, state 16; 416 lines | **Critical** | Ядро поиска: Prisma, ingest YT/IG, tokens, admin events, smart-mix. Любой регресс ломает main UX. |
| `src/lib/token-wallet.ts` | fan-in **22** (#2), deps 6; 235 lines | **Critical** | Биллинг и session для большинства monetized routes. Ошибка = деньги и доступ. |
| `src/lib/admin-events.ts` | fan-in **26** (#1), deps 1; 235 lines | **Critical** | Observability hub; PII scrubbing; circuit breaker при pool errors. |
| `src/components/dashboard/script-generator/ScriptGeneratorSection.tsx` | state **43** (#3), 1 091 lines | **High** | Весь Script Generator UI в одном файле; 15+ useState. |
| `src/components/dashboard/CompetitorSpySection.tsx` | 1 023 lines, deps 13, fan-out 12 | **High** | Полный competitor spy; много handlers; частичный `active` gate. |
| `src/components/dashboard/SearchResultsSection.tsx` | deps 15, fan-out **18**, 455 lines | **High** | `runSearch` / `loadMore` → `postFeed`; главный search UI. |
| `src/app/api/videos/transcribe/route.ts` | deps 14, fan-out 17, 457 lines | **High** | Платная транскрипция; tokens + providers. |
| `src/lib/feed/ingest-youtube.ts` | fan-out 17, callers: feed + lazy-refresh | **High** | Портит/наполняет Video DB для всех пользователей. |
| `src/app/api/youtube/search/route.ts` | deps 14, fan-out **18**, 376 lines | **High** | Параллельный search/ingest backend. |
| `src/lib/competitor-daily-sync.ts` | 565 lines; `chargeMissingDailyRows` → `spendTokens` | **High** | Daily sync + token charge; batch + user wallet. |
| `src/app/api/competitors/route.ts` | 526 lines, deps 9, state 12 | **Medium–High** | CRUD конкурентов; tokens + admin. |
| `src/app/api/script-generator/generate/route.ts` | fan-out 12, 313 lines | **Medium–High** | DeepSeek blocking; spend/refund; не `withApiRoute`. |
| `src/components/dashboard/SavedVideosContext.tsx` | fan-in **7**, fan-out **7**; shared context | **Medium** | Saved state во всех секциях; cache invalidation. |
| `src/lib/dashboard-fetch.ts` | fan-in **9**; client cache orchestration | **Medium** | SSR hydration + все client fetches. |
| `src/app/home-dashboard.tsx` | deps **19**, fan-out **18**; 146 lines | **Medium** | Composition root; поломка = весь shell. |
| `src/lib/providers/tikhubInstagram.ts` | state **37** (#5), 610 lines | **Medium** | Instagram provider boundary; типы + parsing. |
| `src/app/api/trends/lazy-refresh/route.ts` | deps 10, fan-out 9; heavy POST | **Medium** | Client-triggered trend discovery + ingest. |
| `src/components/admin/AdminVideosApp.tsx` | state **47** (#2), 848 lines | **Low–Medium** | Admin-only; не user-facing dashboard. |
| `src/components/dashboard/VideoDetailPanel.tsx` | deps 10, fan-out 8 | **Medium** | Cross-cutting detail drawer. |
| `scripts/seed-youtube.ts` | fan-out **18** (#1 tied), 641 lines | **Low** (prod) | Dev/ops; fan-out высокий, prod impact низкий. |

---

## Technical Debt

| # | Проблема | Влияние на пользователей | Влияние на разработку | Вероятность регрессий |
|---|----------|--------------------------|------------------------|------------------------|
| 1 | Fat API routes (feed, competitors, transcribe) | Медленный search, таймауты | Сложно тестировать и менять изолированно | **Высокая** |
| 2 | UI-монолиты (Script Generator, Competitor Spy) | Баги UI, jank, долгая загрузка JS | Страх рефакторинга; конфликты в git | **Высокая** |
| 3 | ~24/34 routes без `withApiRoute` | Непредсказуемые 500 / форматы ошибок | Несогласованная обработка ошибок | **Средняя–высокая** |
| 4 | Смешанные контракты API success body | Хрупкий frontend | Документация «не трогать keys» vs новые фичи | **Средняя** |
| 5 | Три cache layers без единой модели | Stale data, «не сохранилось» | Сложная отладка | **Средняя** |
| 6 | `mockWeeklyTrends` на home | Неверные/фейковые weekly trends | Путаница prod vs mock | **Низкая** (UX trust) |
| 7 | Docs drift (Auth в routes) | — | Неверные решения новыми dev | **Средняя** |
| 8 | `appRuntimeState` unbounded keys | — | DB bloat, медленные lookups | **Низкая→средняя** (рост) |
| 9 | Нет repository layer | — | Дублирование Prisma queries | **Средняя** |
| 10 | Все tabs mounted | Лишняя память, фоновые effects | Скрытые баги при новых effects | **Средняя** |
| 11 | Два Prisma client / pool | Медленные запросы, 503 | Сложность local/prod parity | **Средняя** под нагрузкой |
| 12 | `allowDangerousEmailAccountLinking` | Account takeover edge cases | Security review fail | **Низкая–средняя** |
| 13 | Seed script высокий fan-out | — | Только dev/CI | **Низкая** (prod) |
| 14 | BACKEND_ARCHITECTURE «avoid dashboard refactors» | — | Блокирует структурные fix | **Н/Д** (процесс) |

---

## Performance Review

### Bottlenecks

1. **`POST /api/videos/feed`** — sync YouTube (до 40 ids) + TikHub Instagram в одном request.
2. **`POST /api/trends/lazy-refresh`** — pool ensure + DB scan + optional external discovery.
3. **`POST /api/script-generator/generate`** — full chat history + DeepSeek до 60 s.
4. **AdminEvent DB writes** на verbose paths (mitigated circuit breaker, но под нагрузкой — blind spots).
5. **Competitor add/sync** — TikHub pagination, daily sync charges.

### Загрузка главной

- **SSR:** `fetchDashboardInitialPayload` — parallel home + trends; `force-dynamic` → всегда DB.
- **Client:** `seedDashboardFromSsr`; staggered saved fetches 12s/18s.
- **Trends:** SSR + poll 120s; lazy-refresh defer 20 min (sessionStorage 15 min gate).
- **Риск:** TTFB при холодном DB; нет static/ISR для `/`.

### Hydration риски

- SSR trends/home seeded into `client-fetch-cache` / sessionStorage — mismatch если SSR и client API diverge.
- `SavedVideosProvider` читает peek cache до server refresh — кратковременный wrong saved state возможен.
- Два `LiveTrendsSidebar` в DOM — state split mitigated by `shouldFetch`, не полным unmount.

### Database risks

- Supabase pool timeout (P2024) → AdminEvent circuit 60s.
- Рост `Video` без archival → slower `loadAndPick`, trend scans.
- `external_search_*` keys в `appRuntimeState` без cleanup.
- Concurrent `spendTokens` — TX есть; UX race (два 402) возможен.

### Caching risks

- Invalidate wrong key после toggle saved.
- Duplicate `/api/saved-videos` для map и list.
- Stale trends/home grid 30 min stale window — OK для UX, плохо для freshness requirements.

### Scaling risks

- Нет edge rate limits на дорогие POST.
- Нет job queue — всё в request thread или client trigger.
- External API quotas (YouTube, TikHub, DeepSeek) без global budget.
- Serverless duration limits на long routes.

---

## Script Generator Review

### Сильные стороны

- Server-only промпты; клиент не тянет secrets.
- Token spend + **refund** on failure — честная экономика.
- Typed DeepSeek errors; Sentry + admin trail.
- REST surface для chats, references, profile — расширяемо.

### Слабые стороны

- ~1 091 строк в одном React-компоненте.
- Full history в каждый `generate` — cost/latency scale with usage.
- Не унифицирован с `withApiRoute`.
- Нет streaming ответа пользователю (blocking wait).

### UX проблемы

- Долгое ожидание без stream (до 60 s).
- Сложный UI (чаты, refs, profile, import) в одном экране — кривая обучения.
- Ошибки модели — generic messages после refund (приемлемо, но friction).

### Архитектурные проблемы

- UI + data fetching + orchestration в одном файле.
- Tab mounted even when inactive (`active` только для части effects).
- Зависимость от `SavedVideos` / feed ecosystem для import video.

### Конкурентоспособность

| Критерий | Оценка |
|----------|--------|
| Reference-based scripts | **Сильно** (video transcript in prompt) |
| Multi-chat | **Средне** (есть, но UI тяжёлый) |
| Speed / streaming | **Слабо** vs ChatGPT-style UIs |
| Cost transparency | **Средне+** (tokens, 402) |
| Reliability | **Средне** (refunds help; blocking calls hurt) |

**Вывод:** функционально конкурентоспособен для niche (short-form + references); отстаёт по **perceived speed** и **UI modularity** от зрелых AI writing tools.

---

## Scaling Review

### 100 пользователей

**Выдержит:** SSR home, search с throttle, trends poll, script generate (если DeepSeek quota OK), token wallet.

**Первым напряжёт:** episodic slow feed search (external APIs); occasional pool wait на free Supabase.

**Сломается:** маловероятно при нормальном распределении запросов.

---

### 1 000 пользователей

**Выдержит:** core flows с throttles; circuit breaker на admin logging; client cache снижает repeat load.

**Первым сломается / деградирует:**

1. **Supabase connection pool** — concurrent feed + lazy-refresh + admin writes.
2. **`POST /api/videos/feed` latency** — timeouts, angry users on search.
3. **DeepSeek rate / cost** — script generator queueing or 502s.
4. **YouTube / TikHub quotas** — empty or stale results.

**Симптомы:** P2024, рост 502 на generate, «пустой поиск», потеря AdminEvent в DB на 60s.

---

### 10 000 пользователей

**Выдержит:** read-heavy paths с cache (home grid peek, trends client cache) — частично.

**Первым сломается:**

1. **DB pool + feed ingest in request** — systemic timeouts.
2. **Video table size** — feed pick / trend pool scans.
3. **Client-triggered lazy-refresh** — thundering herd на discovery.
4. **Monolithic UI bundle** — TTI на слабых устройствах.
5. **Token + wallet hot row** — contention на `userTokenBalance` (TX помогает, но latency растёт).

**Без очередей, rate limits и декомпозиции feed** — **не готов** к устойчивой работе на этом уровне.

---

## Top 20 Improvements

### Critical

| # | Improvement | Priority | Impact | Complexity | Why it matters |
|---|-------------|----------|--------|------------|----------------|
| 1 | Extract feed orchestration из `videos/feed/route.ts` в `lib/feed/*` | P0 | Very high | Medium | Снижает regression risk на #1 product path; упрощает тесты. |
| 2 | Background job queue для ingest, lazy-refresh, daily sync | P0 | Very high | High | Убирает sync work из HTTP; главный scaling fix. |
| 3 | Rate-limit дорогие POST (feed, lazy-refresh, generate) per session/IP | P0 | High | Medium | Защита pool и API quotas от abuse и herds. |
| 4 | Split `ScriptGeneratorSection` + lazy-load scripts tab | P0 | High | Medium–High | Снижает bundle и regression blast radius (#6 complexity file). |

### Important

| # | Improvement | Priority | Impact | Complexity | Why it matters |
|---|-------------|----------|--------|------------|----------------|
| 5 | Unify Prisma pool strategy (document + single-client eval) | P1 | High | Medium | Два pool — скрытый scaling ceiling. |
| 6 | `withApiRoute` + `requireSessionUser` wrapper на critical routes | P1 | Medium–High | Low–Medium | Consistent errors + observability. |
| 7 | Cap script chat context (last N messages) before DeepSeek | P1 | High (cost) | Low–Medium | Cost and latency scale control. |
| 8 | Split `CompetitorSpySection` + gate mount when tab inactive | P1 | High | Medium | 1 023-line risk; perf on home.default tab. |
| 9 | Consolidate saved-video fetches (one API or one client call) | P1 | Medium | Low–Medium | Cache correctness + fewer pool hits. |
| 10 | Bounded cleanup for `appRuntimeState` throttle keys | P1 | Medium (long-term) | Low | Prevents DB sprawl. |
| 11 | Add `maxDuration` + timeout strategy on generate route | P1 | Medium | Low | Serverless stability. |
| 12 | Replace `mockWeeklyTrends` with real data or remove | P1 | Medium (trust) | Low–Medium | Product credibility. |

### Later

| # | Improvement | Priority | Impact | Complexity | Why it matters |
|---|-------------|----------|--------|------------|----------------|
| 13 | Unified `{ success, data }` API migration (phased) | P2 | Medium | High | Developer ergonomics; risky big-bang. |
| 14 | Repository layer over Prisma | P2 | Medium | High | Maintainability at scale. |
| 15 | ISR / partial static for marketing shell (not feed) | P2 | Medium | Medium | TTFB at scale. |
| 16 | HTTP cache headers on read-only GET APIs | P2 | Low–Medium | Medium | CDN-friendly reads. |
| 17 | Streaming DeepSeek responses to UI | P2 | High (UX) | High | Competitive parity. |
| 18 | Refactor `admin-events` split (console vs DB sinks) | P2 | Medium | Medium | Safer hot paths. |
| 19 | AdminVideosApp decomposition | P3 | Low (user) | Medium | Admin-only debt. |
| 20 | OpenTelemetry / external logging (per BACKEND_ARCHITECTURE «Later») | P3 | Medium | High | Prod debugging at 1k+ users. |

---

## Final Verdict

| Dimension | Score (1–5) | Comment |
|-----------|-------------|---------|
| **Product** | 4 | Rich MVP: search, competitors, saved, trends, scripts, tokens. Weekly mock — минус. |
| **Architecture** | 3 | Clear layers on paper; hubs (`token-wallet`, `admin-events`) хороши; routes/UI monoliths тянут вниз. |
| **Maintainability** | 2.5 | Top-20 complex files + debt list = высокий cost of change. |
| **Scalability** | 2 | OK ~100 users; 1k needs hardening; 10k без queue/rate limits — нет. |
| **User Experience** | 3.5 | SSR, cache, stagger — thoughtful; slow search/generate и heavy dashboard JS — минусы. |

**Общий вердикт:** **Solid early-production codebase** с зрелыми operational patterns и **структурным долгом**, который станет блокером роста, если не вынести ingest/sync из request path и не декомпозировать dashboard/script UI.

---

### What should be done in the next 30 days

1. **Вынести orchestration из `feed/route.ts`** в lib-модули (без смены JSON contract) — снизить #1 regression risk.
2. **Ввести rate limits** на `feed`, `lazy-refresh`, `generate` (edge или middleware).
3. **Спроектировать и подключить минимальную job queue** для ingest + lazy-refresh (хотя бы fire-and-forget с idempotency).
4. **Разбить `ScriptGeneratorSection`** на 3–4 компонента + `next/dynamic` для вкладки scripts.
5. **Cap prompt history** в generate route (N последних сообщений).
6. **Один Prisma/pool runbook** в docs: лимиты Supabase, что мониторить (P2024, feed p95).
7. **Убрать или заменить `mockWeeklyTrends`**.
8. **Расширить `withApiRoute`** на feed, transcribe, generate (по одному в неделю, с smoke test).
9. **Объединить saved map+list fetch** на клиенте.
10. **Зафиксировать `DashboardTabPanel` policy:** document когда unmount vs hidden; audit effects на `active`.

---

*Документ собран из CodeGraph Complexity Audit и Architecture Audit. Повторный анализ кода не выполнялся.*
