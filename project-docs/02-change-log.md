# Change Log

> Engineering changes tracked for this knowledge base. Product changelog is not maintained here.

## 2026-05-30 — External search & feed performance fixes

**Files:** `src/lib/search-throttle.ts`, `src/app/api/videos/feed/route.ts`

### 1. External search throttle timing

- **Before:** `markExternalSearchMade(q)` ran before YouTube/TikHub ingest completed.
- **After:** Throttle recorded only when `action === "search"` **and** `ytSaved + igSaved > 0` after ingest finishes.
- **Why:** Failed or empty ingest no longer blocks external refill for 15 minutes.

### 2. Fail-open on throttle read errors

- **Before:** `canMakeExternalSearch` returned `false` on DB/`appRuntimeState` read failure.
- **After:** Returns `true` in `catch` (fail-open); legitimate 15-minute throttle unchanged.
- **Why:** Pool/DB glitches must not silently disable external search.

### 3. Removed feed `totalCount`

- **Before:** Every `POST /api/videos/feed` ran unfiltered `prisma.video.count()`.
- **After:** `totalCount` omitted from feed response.
- **Why:** Full-table count on every search/load-more; home UI already lazy-loads filtered count via `GET /api/videos/home?countOnly=1` (`queryHomeVideoCount` + `HOME_VIDEO_WHERE`).
- **Client impact:** `SearchResultsSection` only sets stat when field present; home path unchanged.

---

## 2026-05-30 — Documentation

- Added `docs/project-audit-master.md` (CodeGraph complexity + architecture audit).
- Added `project-docs/` knowledge base (this folder).

---

## 2026-05-30 — Project knowledge base (`project-docs/`)

- Added 8 markdown docs + `dashboard.html` (offline `file://` capable, embeds markdown).
- Regenerate dashboard after edits: `node project-docs/build-dashboard.mjs`.

---

## Template for future entries

```markdown
## YYYY-MM-DD — Short title

**Files:** `path/to/file.ts`

- What changed
- Why
- User/API impact (if any)
```
