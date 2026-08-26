# Frontend

> Dashboard UI. Design tokens: `DESIGN.md` (корень репозитория). Product copy: `PRODUCT.md`.

## Stack

- Next.js App Router, React 19
- Tailwind CSS 4
- Framer Motion (animations)
- Lucide React (icons)
- `react-markdown` + `remark-gfm` (markdown rendering where used)

## Entry points

| File | Role |
|------|------|
| `src/app/page.tsx` | SSR home, `force-dynamic` |
| `src/app/home-dashboard.tsx` | Dashboard shell, tabs, providers |
| `src/app/layout.tsx` | Root layout, fonts (Geist) |
| `src/app/billing/page.tsx` | Billing page |

## Dashboard structure

```
HomeDashboard
  AuthSessionProvider
  ToastProvider
  SavedVideosProvider
  DashboardLayout
    aside: LiveTrendsSidebar, UserPanel (desktop)
    main: DashboardTabPanel
      home: SearchResultsSection, DashboardHomeOverview
      competitors: CompetitorSpySection
      saved: SavedVideosSection
      scripts: ScriptGeneratorSection
      profile: ProfileHub / ProfileHubPage
      settings: AccountSettingsPage (was modal AccountPanel → settings)
```

## Key components (high complexity)

| Component | ~Lines | Notes |
|-----------|--------|-------|
| `ScriptGeneratorSection.tsx` | ~1091 | Script UI monolith |
| `CompetitorSpySection.tsx` | ~1023 | Competitor UI monolith |
| `SearchResultsSection.tsx` | ~455 | Main search UX |
| `AdminVideosApp.tsx` | ~848 | Admin-only |

## Tab behavior

- URL-driven tabs: `src/lib/dashboard-tab-url.ts`
- `DashboardTabPanel`: children **stay mounted**, visibility via CSS `hidden`
- Pool protection: saved map fetch staggered 12s, list 18s after load

## Client data fetching

- `src/lib/dashboard-fetch.ts` — orchestrates cached fetches
- `src/lib/client-fetch-cache.ts` — SWR memory + sessionStorage
- SSR hydration: `seedDashboardFromSsr(initialPayload)`

## Profile Hub UI

- `src/components/dashboard/profile-hub/ProfileHub.tsx`
- CSS: `profile-hub.css`
- Animated metrics: `ProfileAnimatedNumber.tsx`

## Dashboard Home UI

- `src/components/dashboard/home/DashboardHomeOverview.tsx`
- Activity rings, social cards, AI tasks
- CSS: `dashboard-home-panel.css`

## Video search UI

- `src/components/dashboard/SearchToolbar.tsx` — heading "Поиск видео", popular-query chips, animated placeholder overlay
- Heading "Поиск видео" vertically aligned (top/baseline) with the sidebar "Тренды в реальном времени"
- Chips are a **random subset per page load** (not auto-rotating on the page) and stay in **one horizontal row** — only chips that fully fit the width are shown (never clipped mid-way); clicking fills the existing search input
- Placeholder animation types/holds/erases slowly via an overlay, never the input `value`
- White card/backing wraps **only** the search input + filters; heading and chips sit outside it
- `src/lib/popular-search-queries.ts` — isolated fallback pool (audience-focused RU queries) merged with real topics
- Popular queries injected via SSR `DashboardInitialPayload.popularSearchTopics` (from existing `getPopularSearchTopics` / `SearchQueryLog`)

## Account / billing panel UI

- `src/components/dashboard/UserPanel.tsx` — sidebar rail: email inside the green tariff block above the plan name (vertically centered between the block's top edge and the plan name); plan name same font-size as the token balance on the same row (right-aligned to the block edge, lightning icon); a horizontal dotted remaining-tokens scale of many short tick segments (`TOKEN_SCALE_SEGMENTS = 16`, fill per remaining %); full-width green tariff block whose top edge meets the panel top (no white top strip, no side insets); upgrade CTA ("Перейти на PRO/BUSINESS" with a solid `Crown` icon from `lucide-react` + rounded "Улучшить" button, no green backing behind the row, one hover group, hidden for BUSINESS); "Настройки аккаунта" is a nav row right under "Профиль" that navigates to the `settings` Dashboard tab; "Пополнить"/"Тариф" buttons removed from the rail
- `src/components/dashboard/AccountSettingsPage.tsx` — full Dashboard tab "Настройки аккаунта" (rendered via `DashboardTabPanel`, URL `?tab=settings`), reuses `AccountSettingsContent`; replaced the modal-based settings panel
- `src/components/dashboard/TokenUsageSection.tsx` — "Использование токенов" sub-tab inside the settings page (added to `AccountSettingsContent` tab bar): header with refresh + period controls (30/90 days, all), 4 stat cards (spent tokens, used tokens, functions used, generations), a CSS bar chart of spend by day, and a ledger history table; data reused from the existing `/api/billing/me` (wallet + ledger) — no new API/backend; empty states when no data
- `src/components/dashboard/AccountPanel.tsx` — modal with a persistent summary header (`AccountSummary`) + tabs (Тарифы / Токены / Настройки); settings tab no longer opened from the rail (settings is now the `settings` tab) — modal still used for plans/tokens (billing-only)
- `src/components/dashboard/billing-panels.tsx` — `AccountSummary` (balance, plan, CTA, secondary stats), plan tiles, token packs
- Billing stats (plan, next grant, spent/granted) and the plan's token limit reused from the existing `/api/billing/me` result + `billing.config.ts` in `UserPanel` — no new requests

## Promo mechanics (header + feed card)

- `src/components/dashboard/BillingContext.tsx` — single client source for plan/balance/plan-limit (one `/api/billing/me` fetch; `UserPanel` consumes it, no duplicate queries)
- `src/components/dashboard/promo/PromoProvider.tsx` — decides the offer: **guests** (detected via the existing session state `useAuthDisplay().showGuest`) always get a registration offer; **authenticated** users get the once-per-day upgrade/token offer with the 1h timer, close-dialog state and stable per-day card variant, plus the `HeaderOfferInfo` the header renders (plan, prices, `tokensPerPeriod`/`maxCompetitors` from `BILLING_PLANS[nextPlanId]`). Storage is versioned and scoped per user (`viral:promo:v2:<email-hash|anon>`); a new day resets the rule, and an **expired** today-state is regenerated on init (fresh `expiresAt`, `headerShown` preserved) so a reload/stale test state never permanently hides the banner. Guests don't wait for billing (registration offer is tariff-independent); authenticated users wait for the real plan. `decision`/`dismiss`/dialog state resets on auth/scope change so the two offers never mix and the banner reappears after auth settles
- `src/components/dashboard/promo/PromoHeader.tsx` — compact graphite/gold top header. For **authenticated** users the whole composition `[offer «−30% НА PRO»/«НА BUSINESS» (caps, gold) → discounted price (white, prominent) + struck-through old price → tokens + monthly-competitors (same real data as the card, gold icons) → gold countdown pill → «Улучшить» CTA]` sits in the middle `auto` column of `lg:grid-cols-[1fr_auto_1fr]`, centered at `viewport/2`; the close (×) is absolutely pinned to the right edge. For **guests** it renders a registration header («Пробный режим» + subtitle + «Регистрация», reusing `useAuthGate().openAuth("signup")`), same container/centering, close dismisses directly. On mobile (`grid-cols-1`) the composition stays centered and wraps. Rendered above the sidebar+main row so it spans the full viewport width (edge to edge, `rounded-b-xl`, squared top); `px-6` padding
- `src/components/dashboard/promo/PromoCloseDialog.tsx` — confirmation dialog showing the specific offer, prices, savings and remaining time (gold accent); only used for the authenticated discount offer
- `src/components/dashboard/promo/PromoCard.tsx` — premium graphite/gold feed promo card at the first video position in the normal home feed. **Guests** get a registration card («Пробный режим», subtitle, short list of real features, «Регистрация» CTA → `openAuth("signup")`). **Authenticated** users get the upgrade or token-pack offer: gold "−30%"/plan (no brand label), big discounted price + old price, gold savings, volumetric gold badge (crown/lightning) with glow, compact feature rows with real plan data (`tokensPerPeriod`, `maxCompetitors`), large gold text-only CTA (no arrow)
- `src/lib/billing/promo.ts` — offer logic (next plan, −30% from existing prices, token packs, per-day variant pick incl. `"registration"` for guests, per-user daily `localStorage`, `userScope`/versioned keys); `planDisplayName(planId)` maps plans to English display names (FREE/TRIAL/PRO/BUSINESS) for the promo UI (internal `BILLING_PLANS[].name` unchanged)
- `VideoGrid.tsx` — optional `leadPromo` slot (UI layer; does not touch the video array/pagination; never shown during search)
- Upgrade / token-purchase reuse the existing `viral:open-account` event → `AccountPanel`
- Promo card design is intentionally distinct from the light ViralCloud surface (BLACK/GRAPHITE + GOLD + WHITE) — a separate premium offer, not a banner

## Design system (summary)

From `DESIGN.md`:
- Primary: `#059669` (emerald)
- Shell bg: `#f4f5f7`
- Typography: Geist Sans / Mono
- Register: **product** (dashboard serves product, not marketing)

Full tokens: see `DESIGN.md` — not duplicated here.

## Feature flags

- `SHOW_WEEKLY_TRENDS_PANEL = false` in `dashboard-feature-flags.ts`

## Edit guardrails

Do not refactor dashboard layout, sidebar variants, or `home-dashboard.tsx` structure unless explicitly requested. See [[backend]].

## Связанные документы

- [[architecture]]
- [[user-flow]]
- [[features]]
- `DESIGN.md`, `PRODUCT.md`
