<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Backend (Postgres / Supabase)

Before editing API routes or Prisma: read `docs/BACKEND_ARCHITECTURE.md`. Do not refactor dashboard layout or mobile/sidebar variants unless explicitly requested.
<!-- END:nextjs-agent-rules -->

## Design Context

Strategic and visual design specs live at the project root:

- **`PRODUCT.md`** — register (`product`), users, purpose, brand personality, anti-references, design principles. Read before any UI or copy work.
- **`DESIGN.md`** — colors, typography, elevation, components, do's/don'ts (YAML frontmatter + markdown). Read before generating or restyling screens.

Default register is **product** (dashboard serves the product). Live variant mode is pre-configured in `.impeccable/live/config.json`.
