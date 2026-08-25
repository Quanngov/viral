# Development Log

> Engineering changelog for knowledge base. Product release notes: **не определено в текущем проекте**.

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
