# Development Log

> Engineering changelog for knowledge base. Product release notes: **не определено в текущем проекте**.

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
