<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Backend (Postgres / Supabase)

Before editing API routes or Prisma: read `docs/02-architecture/backend.md` (formerly `docs/BACKEND_ARCHITECTURE.md`). Do not refactor dashboard layout or mobile/sidebar variants unless explicitly requested.
<!-- END:nextjs-agent-rules -->

## Design Context

Strategic and visual design specs live at the project root:

- **`PRODUCT.md`** — register (`product`), users, purpose, brand personality, anti-references, design principles. Read before any UI or copy work.
- **`DESIGN.md`** — colors, typography, elevation, components, do's/don'ts (YAML frontmatter + markdown). Read before generating or restyling screens.

Default register is **product** (dashboard serves the product). Live variant mode is pre-configured in `.impeccable/live/config.json`.

## Documentation (mandatory)

`docs/` is the single source of truth for project documentation and is synchronized with Obsidian.

- Never create separate documentation outside `docs/` if a corresponding document already exists.
- Do not create duplicate documents — update the existing one.
- Documentation must reflect the actual implemented state of the project, not plans.

### When to update

After ANY change that alters behavior, architecture, UI, API, database, integrations, configuration, or fixes a significant bug, update the relevant documentation in `docs/`. This includes:

- new features and changes to existing features;
- UI/UX changes;
- API, OAuth, and social-network integrations;
- Prisma / database / migrations;
- architectural changes;
- significant bug fixes;
- performance and security changes;
- env/config changes;
- enabling or disabling functionality.

### Changelog

Always add a short entry to the existing changelog:

`docs/09-changelog/development-log.md`

Do not create a second changelog. Each entry must contain:

- date;
- what changed;
- which files/modules are affected;
- a brief result;
- the reason, if important.

Do not record minor intermediate actions that do not change the project. Never rewrite or delete historical entries.

### Feature documentation

Update the corresponding document in `docs/` when it exists, without unnecessary duplication:

- OAuth / social integrations → `docs/04-integrations/*`
- Prisma / database / migrations → `docs/03-database/*`
- Dashboard UI → `docs/02-architecture/frontend.md`
- Backend / API / lib → `docs/02-architecture/backend.md`
- Deployment → `docs/07-infrastructure/deployment.md`
- Current project state → `docs/00-project/current-status.md`
- Architecture decisions → `docs/08-decisions/architecture-decisions.md`

### Workflow after each task

1. Check the changed files.
2. Determine which documents in `docs/` the change affects.
3. Update the changelog.
4. Update the relevant technical documentation if needed.
5. Check `git diff` and confirm the documentation is actually changed.
6. Only then report the task as complete.

A task is not fully complete if the code changed but the required documentation was not updated. Do not just say "Documentation should be updated." — actually edit the files in `docs/`.

In the final report always state:

`Documentation updated: <list of changed documents>`

or, if documentation was truly not required:

`Documentation updated: none — no persistent project change.`
