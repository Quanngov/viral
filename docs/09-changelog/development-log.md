# Development Log

> Engineering changelog for knowledge base. Product release notes: **не определено в текущем проекте**.

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
