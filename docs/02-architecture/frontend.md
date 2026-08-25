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
