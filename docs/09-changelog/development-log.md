# Development Log

> Engineering changelog for knowledge base. Product release notes: **не определено в текущем проекте**.

## 2026-08-26 — Promo: fix header visibility + premium gold redesign

**Files:** `src/components/dashboard/promo/PromoProvider.tsx`, `src/components/dashboard/promo/PromoCard.tsx`, `src/components/dashboard/promo/PromoHeader.tsx`, `src/components/dashboard/promo/PromoCloseDialog.tsx`, `src/lib/billing/promo.ts`

- **Fixed header visibility for authenticated users**: the once-per-day state was stored under a single unversioned, browser-global `localStorage` key, so a stale test value (or a guest/another account) permanently hid the header for a logged-in user in a normal browser. Storage is now versioned and scoped per user (`viral:promo:v2:<email-hash|anon>`), so old test keys no longer block the offer; the guest and authed contexts use separate keys, and a new day resets the once-per-day rule. The provider now waits for both billing and session to settle (`!billing.loading && !sessionLoading`) so the scope/plan are stable and the header does not flash or disappear after the first render (no hydration mismatch — all state stays client-side).
- **Redesigned promo card** to a premium graphite/gold offer (matches the reference): near-black `#0e0f12` card, thin gold border, soft gold glow and top radial highlight, gold sparkles; large gold "−30%", white plan name, big discounted price + strikethrough old price, gold "Экономия X ₽"; volumetric gold badge (crown for upgrade, lightning for tokens) with glow; feature rows with dark tile + gold icon + gold value + light label (real data from `billing.config.ts`: `tokensPerPeriod`, `maxCompetitors`); large gold CTA "Улучшить"/"Купить токены" with arrow. Token-pack card uses the same visual language with real `TOKEN_PACKS` values.
- **Redesigned promo header** to a compact horizontal version of the card: dark graphite background, thin gold border, gold "−30%", plan name, discounted+old price (desktop), gold timer pill, gold CTA, close (×). Timer logic unchanged.
- Close-dialog accent aligned to gold (was rose/emerald).
- No billing/pricing/checkout/Prisma changes; upgrade/buy still reuse `viral:open-account` → `AccountPanel`.
- **Result:** header now reliably shows for authenticated users (old test state cannot block it), and all promo surfaces look like a premium limited-time offer. UI-only.

## 2026-08-26 — Promo: point-wise design refinements (arrows, full-width header, branding, feature rows)

**Files:** `src/components/dashboard/promo/PromoCard.tsx`, `src/components/dashboard/promo/PromoHeader.tsx`, `src/app/home-dashboard.tsx`

- **CTA buttons:** removed the arrow icon from all promo CTA buttons (card «Улучшить»/«Купить токены» and header «Улучшить») — buttons now contain text only, visually centered; unused `ArrowIcon` component removed
- **Top header:** promo header now spans the full viewport width (edge to edge) instead of being constrained to the main dashboard content area. The dashboard container was reflowed into a `flex-col` so the header sits above the sidebar+main row and fills 100% of the viewport width; inner content is aligned to the main content column (`lg:pl-[384px]` = 360px sidebar + 24px content padding, `px-6` elsewhere). Squared top / `rounded-b-xl` bottom corners for an edge-to-edge top bar. Desktop and mobile adapt correctly; no white side gaps; no other dashboard components changed
- **Promo card:** removed the «ViralCloud» brand label from the top of both card variants (upgrade and token-pack)
- **Feature rows:** slightly reduced the size of the feature rows (value `text-base` → `text-sm`, label `text-xs` → `text-[11px]`) so the two rows read more compactly and don't compete with the offer/price/CTA. Icons, counts, and structure unchanged
- Colors, gold styling, card dimensions, offer/prices, tariff logic, timer, and billing/purchase flow unchanged. UI-only.

## 2026-08-26 — Promo: header offer text, price, features & centering

**Files:** `src/components/dashboard/promo/PromoHeader.tsx`, `src/components/dashboard/promo/PromoProvider.tsx`, `src/components/dashboard/promo/PromoCard.tsx`

- **Offer text:** «−30% на PRO» → «−30% НА PRO» everywhere («НА PRO»/«НА BUSINESS» now in caps and gold, same color as the −30%; also in the close-dialog title via the provider string)
- **Header price:** the discounted price is now white, larger (`text-xl font-black`), always visible, and a prominent header element; the old price stays struck-through and secondary. Price values and discount logic unchanged
- **Header features:** added the two card characteristics (tokens, monthly competitors) between the price and the timer, reusing the same real data the card uses (`BILLING_PLANS[nextPlanId].tokensPerPeriod`/`maxCompetitors`, exposed on `HeaderOfferInfo`); rendered compactly in the horizontal header with the same gold icons (Zap/Users). No new pricing/token logic
- **Centering:** offer, price, features, and timer are grouped in one centered block (`flex-1 justify-center`); the close (×) stays on the right outside the centered content, CTA keeps its position
- Card design, gold/black scheme, border, CTA, timer logic, prices, billing, purchase/upgrade flow, and show-logic unchanged. UI-only.

## 2026-08-26 — Promo: viewport-centered header + English plan names

**Files:** `src/components/dashboard/promo/PromoHeader.tsx`, `src/lib/billing/promo.ts`

- **Header centering vs viewport:** the promo header content (offer, price, old price, tokens/competitors, timer) is now centered relative to the full viewport width (`viewport/2`), not the inner Dashboard container. Removed the `lg:pl-[384px]` offset (which aligned to the dashboard column and shifted the center) and rebuilt the bar with a `lg:grid-cols-[1fr_auto_1fr]` layout — the equal left/right `1fr` columns keep the text block exactly at screen center while the CTA + close (×) live in the right column (out of the centering). On mobile (`grid-cols-1`) the content block centers and the CTA/close stack below, close stays at the right
- **Plan names in English (promo UI only):** added `planDisplayName(planId)` in `promo.ts` (FREE/TRIAL/PRO/BUSINESS) and used it for `nextPlanName` in `computeUpgradeOffer`, so the header, promo card, and close dialog all show «−30% НА PRO»/«−30% НА BUSINESS» instead of Russian names («Про»/«Бизнес»). «НА» is caps everywhere. Internal `BILLING_PLANS[].name`/backend values are unchanged — normalization is display-only
- No color/size/price/discount/timer/billing/checkout/show-logic changes. UI-only.

## 2026-08-26 — Promo: card «НА PRO» sizing + header composition (timer→CTA, full-composition centering)

**Files:** `src/components/dashboard/promo/PromoCard.tsx`, `src/components/dashboard/promo/PromoHeader.tsx`

- **Card «−30% НА PRO» sizing:** «НА PRO»/«НА BUSINESS» in the promo card now uses the exact same style as «−30%» (`text-[34px]`, `font-black`, `leading-none`, `tracking-tight`, gold) — same font-size, line height and visual hierarchy; text unchanged («−30% НА PRO» / «−30% НА BUSINESS»)
- **Header composition order & CTA:** «Улучшить» is now a direct member of the centered composition immediately after the timer (same `gap-x-4` spacing as the other elements), so the whole `[offer → price → tokens/competitors → timer → Улучшить]` reads as ONE horizontal group
- **Centering of the whole composition:** the entire composition (including «Улучшить») sits in the middle `auto` column of `lg:grid-cols-[1fr_auto_1fr]`, so `center(composition) = viewport/2`. The close (×) is absolutely positioned at the right edge (`absolute right-3 top-1/2`) and does not participate in the centering calculation
- **Responsive:** on narrow screens the composition stays centered and wraps (button still after timer); nothing overflows. Color scheme, gold style, border, background, prices, discount, timer, feature texts, billing, upgrade flow, and show-logic unchanged. UI-only.

## 2026-08-26 — Promo: registration offer for unauthenticated users

**Files:** `src/components/dashboard/promo/PromoProvider.tsx`, `src/components/dashboard/promo/PromoHeader.tsx`, `src/components/dashboard/promo/PromoCard.tsx`, `src/lib/billing/promo.ts`

- **Guest header:** for unauthenticated users the promo header now shows a separate registration offer instead of the discount offer — «Пробный режим» (bold, gold, main text) + «Чтобы открыть все функции зарегистрируйтесь» + «Регистрация» button. No −30%, PRO/BUSINESS, prices, timer or upgrade CTA. Same premium graphite/gold container, border and viewport-centering; the close (×) dismisses directly (no discount-confirmation dialog). Reuses the existing registration flow (`useAuthGate().openAuth("signup")` → `AuthModal`)
- **Guest card:** the first normal-feed position for guests renders a registration card (same premium promo-card style): «Пробный режим», «Зарегистрируйтесь, чтобы открыть полный доступ к функциям ViralCloud», a short list of real existing features (поиск видео и тренды, конкуренты/мониторинг, скрипты/AI-генератор), and the «Регистрация» CTA. It only occupies the lead position in the normal home feed (`!isSearchMode`), never search results; no effect on pagination or real video data
- **Logic:** added `"registration"` to `PromoVariant`; the provider detects guests via the existing session state (`useAuthDisplay().showGuest`, not localStorage). Guests always get the registration header/card (hydrated, dismissible, no expiry/timer gating); authenticated users keep the existing upgrade/token offers unchanged. `dismiss`/dialog state resets on auth-state change so the two offers never mix
- Auth backend, OAuth, Prisma, billing, token logic, pricing, registration flow, search, video loading, and API untouched. UI-only.

## 2026-08-26 — Promo: fix banners not rendering (daily-visibility + auth timing)

**Files:** `src/components/dashboard/promo/PromoProvider.tsx`

- **Root cause (why no banner showed for anyone):**
  - **Stale/expired persisted state.** The once-per-day state was stored per user/day. If `localStorage` held a state for *today* with an **expired** `expiresAt` (an earlier test run, or a reload more than 1h after the offer was generated) and/or `headerShown: true`, then `offerActive` (`expiresAt > now`) was false → the card was hidden for the rest of the day, and the header was hidden by `headerShown`. Reloading the dev server never reset it, so old test state permanently suppressed all banners for that user/scope.
  - **Guests waited for billing.** The init gate required `!billing.loading` even for guests, although the registration offer needs no billing. If billing hadn't settled (or was slow), `hydrated` never became `true` → neither header nor card ever rendered for guests.
  - **One-shot `decision` freeze.** The header `decision` was computed once and never recomputed; a transient state (auth still loading, or `state === null`) could freeze `show: false`, so once auth resolved the banner never appeared.
- **Fix:**
  - **Regenerate expired offers.** On init, if a today-state's `expiresAt` is in the past, a fresh offer period is started (new `expiresAt`); `headerShown` is preserved so the once-per-day header rule still holds. The card reappears after reload; the header still hides if it was already shown today.
  - **Guests don't wait for billing.** The init gate now only waits for the session (`sessionLoading`) for guests (registration offer is tariff-independent); authenticated users still wait for the real plan.
  - **Reactive decision.** `decision`/`dismissed`/`closeDialogOpen` reset whenever auth state (`isGuest`) or user scope changes, and the decision effect no longer runs while `state` is absent, so the banner reliably (re)appears after auth settles and the two offer variants never mix.
- Design, texts, colors, prices, timer, billing, auth backend, upgrade/registration flow, and search behavior unchanged. Logic-only fix.

---

## 2026-08-25 — Promo mechanics: top header + feed promo card

**Files:** `src/components/dashboard/BillingContext.tsx`, `src/components/dashboard/promo/*`, `src/lib/billing/promo.ts`, `src/app/home-dashboard.tsx`, `src/components/dashboard/VideoGrid.tsx`, `src/components/dashboard/SearchResultsSection.tsx`, `src/components/dashboard/UserPanel.tsx`

- Added a compact rose top promo header ("−30% на следующий тариф") with a real 1-hour countdown, upgrade CTA and a close (×) that opens a confirmation dialog (offer, prices, savings, remaining time)
- Header shows once per day (persisted in `localStorage`), timer continues across reloads and expires cleanly (no negative time)
- Added a promo card at the first video position in the normal feed (UI layer, not a fake video; never shown during search). Variant alternates per day between upgrade and token-pack
- Offer prices/discounts/token packs derived from existing `billing.config.ts`; upgrade/buy reuse the existing `viral:open-account` → `AccountPanel` flow
- `BillingContext` shares one `/api/billing/me` fetch; `UserPanel` refactored to consume it (removes duplicate balance/subscription queries)
- **Result:** new promo surfaces + billing data sharing. No backend/API/Prisma/token-logic changes.

---

## 2026-08-25 — Settings: "Использование токенов" usage page

**Files:** `src/components/dashboard/TokenUsageSection.tsx` (new), `src/components/dashboard/mock-dashboard-panels.tsx`

- Added an "Использование токенов" tab to the account-settings tab bar; it renders `TokenUsageSection`
- Page follows the light ViralCloud design (emerald accent, zinc grays, `rounded-2xl` cards): header with refresh + period select (30d/90d/all), 4 stat cards (spent tokens, used tokens, functions used, generations), a pure-CSS daily spend bar chart, and a ledger history table (date, action, type, tokens, balance)
- Data reused from the existing `/api/billing/me` (`wallet.totalSpent`, ledger SPEND items); spend classified by `reason` (`script_generator`, `video_transcription`, `feed_search`, `competitor_*`, …) — no new API/backend/Prisma
- Shows empty states (chart "Данных об использовании пока нет", history "Истории использования пока нет") when no data
- **Result:** UI-only usage screen inside the existing settings tab; no backend/API/billing/token logic changes, no new requests.

---

## 2026-08-25 — Account settings: modal → dedicated Dashboard tab

**Files:** `src/components/dashboard/AccountSettingsPage.tsx` (new), `src/components/dashboard/UserPanel.tsx`, `src/app/home-dashboard.tsx`, `src/lib/dashboard-tab-url.ts`

- Added a new `settings` value to `DashboardView`; "Настройки аккаунта" in the rail now navigates to the `settings` tab (with active-state highlight) instead of opening the modal
- Created `AccountSettingsPage` — a full Dashboard page/tab (same pattern as `ProfileHubPage`), rendered via `DashboardTabPanel` and URL `?tab=settings`; reuses the existing `AccountSettingsContent` so every existing setting and its behaviour is preserved
- `AccountPanel` modal remains for plans/tokens (billing-only); its settings tab is no longer triggered from the rail
- Registered `settings` in `VALID_TABS` and in `dashboard-tab-url.ts` (`tabQueryToView` / `viewToTabQuery`)
- **Result:** display/navigation only (modal → separate tab); user can return to "Профиль" via existing nav. No settings added/removed, no backend/API/Prisma/billing changes.

---

## 2026-08-25 — Tariff rail: bigger plan-name font, centered email

**Files:** `src/components/dashboard/UserPanel.tsx`

- Plan name font-size increased `text-sm` → `text-lg` (same size as the token count to its right); used `leading-none` so the plan row keeps the same height (18px) as the balance line — green block height unchanged
- Email raised to sit vertically centered between the green block's top edge and the plan name: email top offset `mt-3` → `mt-1` (top gap `pt-2.5` + `mt-1` = 14px) and plan row offset `mt-1.5` → `mt-3.5` (gap below email = 14px), so the gaps above and below the email are equal; email font-size/style unchanged
- Sum of email/plan margins preserved (4+14 = 12+6), so total panel height unchanged
- **Result:** UI-only. No backend/API/Prisma/billing/token changes, no new requests, no refactor.

---

## 2026-08-25 — Tariff rail: email above plan name, no white top strip

**Files:** `src/components/dashboard/UserPanel.tsx`

- Email moved above the plan name inside the green tariff block (order now: email → plan name → balance/scale → CTA), with a small top offset (`mt-3`) and a neat gap to the plan row (`mt-1.5`); size/style unchanged
- Removed the visible white parent-container strip above the green block: white container top padding `p-3` → `px-3 pb-3` (top 0), so the panel's top edge now ends directly at the green block
- Total panel height preserved: green block grew the same amount as the removed white top (`mt-3` + `mt-1.5` vs the old email `mt-1.5`); bottom of the panel unchanged
- Guest/loading states keep their previous 12px top offset (`pt-3` added to `authPlaceholder` and `guestAuthButtons`) so they are not cramped by the container change
- **Result:** UI/layout only. No backend/API/Prisma/billing/token changes, no new requests, no refactor.

---

## 2026-08-25 — Tariff rail point fixes (dotted scale, email placement, crown CTA)

**Files:** `src/components/dashboard/UserPanel.tsx`

- Remaining-tokens scale is now a horizontal dotted scale of many short tick segments (`TOKEN_SCALE_SEGMENTS = 16`) across the full block width; fill still reflects remaining % via the existing `remainingPct` logic (same inner-fill per segment)
- Balance (with lightning icon) stays on the same row as the plan name, right-aligned to the block edge (unchanged)
- User email moved inside the green tariff block, under the plan name row with a normal top offset (`mt-1.5`), styled `text-emerald-800/70`; removed the separate email line from the white panel
- Upgrade CTA: added a small solid (filled) `Crown` icon from the existing `lucide-react` before the "Перейти на PRO/BUSINESS" text; CTA row pushed lower (gap between scale and CTA `mt-2` → `mt-4`)
- Internal spacing redistributed to keep panel height unchanged (green block `pb-2.5` → `pb-1.5`, nav `mt-2` → `mt-1.5`)
- "Улучшить" button keeps its previous more-rounded `rounded-xl` (rectangular, not pill)
- **Result:** UI/layout/spacing only, panel height preserved. No backend/API/Prisma/billing/token changes, no new requests.

---

## 2026-08-25 — Account rail CTA & scale polish

**Files:** `src/components/dashboard/UserPanel.tsx`

- Removed the green backing behind the "Перейти на PRO/BUSINESS" + "Улучшить" CTA — now just text + button on the tariff block background (hover still one group)
- "Улучшить" button made more rounded (`rounded-xl`)
- Token scale reduced to 2 large segments; fill still reflects remaining % via existing `remainingPct`
- **Result:** UI-only, panel height preserved. No backend/API/Prisma/billing changes.

---

## 2026-08-25 — Account rail layout: right-aligned balance, full-width tariff block, larger CTA

**Files:** `src/components/dashboard/UserPanel.tsx`

- Balance moved to the right side of the tariff block, directly above the dotted scale and right-aligned to its edge (same row as plan name, justified)
- Green tariff block made full-width (no side insets / no white backing around it) via negative margin vs the white panel
- Upgrade CTA enlarged (solid emerald primary, larger "Перейти на PRO/BUSINESS" text + bigger "Улучшить"); gap between scale and CTA increased
- **Result:** UI/layout/spacing only, panel height preserved. No backend/API/Prisma/billing/token changes.

---

## 2026-08-25 — Account rail UX: balance/total + dotted scale + upgrade CTA

**Files:** `src/components/dashboard/UserPanel.tsx`

- Rail balance now shows "X / total" (current / plan allowance) with lightning icon; separate "токенов" label removed
- Added dotted remaining-tokens scale (fills per % of remaining balance; safe for 0% / 100% / no-limit)
- Added plan-aware upgrade CTA "Перейти на PRO/BUSINESS" + "Улучшить" as one hover group (hidden for BUSINESS); reuses existing upgrade flow
- "Настройки аккаунта" moved into the nav right under "Профиль" (styled as a nav row); "Пополнить"/"Тариф" buttons removed from the rail
- Data reused from existing `/api/billing/me` + `billing.config.ts` (plan id, balance, plan token limit) — no new API/Prisma requests
- **Result:** UI-only, panel height preserved (compacted internal spacing). No backend/API/billing/token-wallet changes.

---

## 2026-08-25 — Account panel UI redesign (tokens / billing / settings)

**Files:** `src/components/dashboard/UserPanel.tsx`, `src/components/dashboard/AccountPanel.tsx`, `src/components/dashboard/billing-panels.tsx`

- Redesigned the account/billing panel into a clear hierarchy: persistent summary header (prominent token balance, plan chip, primary "Пополнить токены" CTA, secondary stats) + tabs (Тарифы / Токены / Настройки)
- Sidebar rail: prominent balance + plan + CTAs, quieter settings entry
- Billing stats now reused from the existing `/api/billing/me` result already fetched in `UserPanel` (plan, next grant, spent/granted) — no new API/Prisma requests
- Removed the now-redundant per-tab balance banner (balance shown once in the summary)
- **Result:** UI/UX-only. No backend/API/Prisma/billing/token-wallet changes; all existing actions preserved.

---

## 2026-08-25 — Search UI: heading alignment + single-row chips

**Files:** `src/components/dashboard/SearchToolbar.tsx`

- "Поиск видео" heading moved down (`mt-4`) so its top/baseline aligns with the sidebar "Тренды в реальном времени"
- Popular-query chips now stay in **one horizontal row** (`flex-nowrap` + `overflow-hidden`); only chips that fully fit the available width are rendered (measured via `ResizeObserver`), never clipped mid-way; set still random per page load
- **Result:** two point UI/UX edits. No changes to search logic/API/Prisma/backend/placeholder animation.

---

## 2026-08-25 — Search UI polish: calm typing, no auto-rotating chips, white-card split

**Files:** `src/components/dashboard/SearchToolbar.tsx`, `src/lib/popular-search-queries.ts`

- Placeholder "typing" slowed down: per-char typing, long hold when fully typed, calmer erase and pause between queries; still an overlay, never touches input `value`
- Popular-query chips no longer auto-rotate on the page; a **random subset** is picked once per page load (stable while on the page)
- Fallback query list expanded and re-focused on the ViralCloud audience (clients, promotion, views, Reels/Shorts/TikTok, video editing, lead-gen via content)
- White card now wraps **only** the search input + filters; heading "Поиск видео" and chips sit outside it on the page background
- **Result:** point UI/UX edits only. No search logic/API/Prisma/backend/OAuth changes.

---

## 2026-08-25 — Video search UI: heading, popular-query chips, animated placeholder

**Files:** `src/components/dashboard/SearchToolbar.tsx`, `src/components/dashboard/SearchResultsSection.tsx`, `src/lib/popular-search-queries.ts` (new), `src/lib/dashboard-initial.ts`, `src/lib/dashboard-server-data.ts`

- Added "Поиск видео" heading above the search input (matches "Тренды в реальном времени" style)
- Added rotating popular-query chips; a click fills the existing search input (no separate search)
- Added typing/erasing animated placeholder via an overlay — never touches the input `value`, so user typing is not disturbed
- Popular queries come from real `SearchQueryLog` history via existing `getPopularSearchTopics` (injected into SSR `DashboardInitialPayload`), with an isolated fallback list in `popular-search-queries.ts`
- **Result:** UI/UX-only change. No changes to search logic, search API, Prisma, schema or migrations; no new endpoint.

---

## 2026-08-15 — Documentation audit

**Scope:** Full project documentation restructure for Obsidian + Cursor.

- Created unified `docs/` knowledge base (00-project → 09-changelog)
- Consolidated content from `project-docs/`, `docs/BACKEND_ARCHITECTURE.md`, `docs/project-audit-master.md`
- Added [[current-status]] with factual state including social sync, profile hub, Instagram OAuth issue
- Added [[architecture-decisions]] from code and existing decision docs
- Preserved `PRODUCT.md`, `DESIGN.md`, `AGENTS.md` at repository root
- Old paths retain redirect stubs pointing to canonical docs
- **No application code changed**

---

## 2026-05-30 — External search & feed performance fixes

**Files:** `src/lib/search-throttle.ts`, `src/app/api/videos/feed/route.ts`

- Throttle recorded only after successful ingest (`saved > 0`)
- Fail-open on throttle read errors
- Removed `totalCount` from feed response

---

## 2026-05-30 — CodeGraph audit

- Complexity + architecture audit → [[code-audit-2026-05-30]]
- Initial `project-docs/` knowledge base created

---

## Template

```markdown
## YYYY-MM-DD — Title

**Files:** `path/to/file.ts`

- What changed
- Why
- User/API impact (if any)
```

## Связанные документы

- [[roadmap]]
- [[current-status]]
- Legacy changelog: `project-docs/02-change-log.md` (redirect)
