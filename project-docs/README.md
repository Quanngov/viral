# project-docs (redirect)

> **Documentation moved to `docs/`** — see [[../docs/README|docs/README.md]].

## Mapping

| Old file | New canonical location |
|----------|------------------------|
| `00-project-overview.md` | [[../docs/00-project/current-status|current-status]] + [[../docs/02-architecture/architecture|architecture]] |
| `01-architecture.md` | [[../docs/02-architecture/architecture|architecture]] |
| `02-change-log.md` | [[../docs/09-changelog/development-log|development-log]] |
| `03-ai-prompts.md` | [[../docs/04-integrations/ai|ai]] |
| `04-services-and-integrations.md` | [[../docs/07-infrastructure/infrastructure|infrastructure]] |
| `05-known-decisions.md` | [[../docs/08-decisions/architecture-decisions|architecture-decisions]] |
| `06-audits.md` | [[../docs/02-architecture/code-audit-2026-05-30|code-audit-2026-05-30]] |
| `07-roadmap.md` | [[../docs/00-project/roadmap|roadmap]] |
| `billing-monetization.md` | [[../docs/01-product/features|features]] (billing section) + `src/lib/billing/billing.config.ts` |
| `pricing/*` | Unchanged — unit economics models (not duplicated in `docs/`) |

## Dashboard HTML

Offline viewer: `project-docs/dashboard.html`  
Regenerate: `node project-docs/build-dashboard.mjs`

**Note:** Dashboard may reference old paths until regenerated.
