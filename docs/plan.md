# Plan

Build order of the template. Each phase ends green (lint, typecheck, test) with a commit. The
reference is `team-app`; only its architecture is copied, never its product features.

Legend: 🟦 Sonnet is enough · 🟥 use Opus (a decision that is expensive to undo)

| # | Phase | Delivers | Model |
| --- | --- | --- | --- |
| 0 | Repo foundation | Node/pnpm workspace, tsconfig base, Biome, Vitest, Lefthook + commitlint, AGENTS.md, ADRs | 🟦 |
| 1 | `packages/contracts` | `Health` Zod schema + inferred type, first TDD cycle | 🟦 |
| 2 | API walking skeleton | `node:http` pipeline, error/problem format, `health` module, composition root, `Clock`/`IdGenerator` ports, dependency-cruiser + domain-purity gates, contract integration test | 🟦 |
| 3 | Web walking skeleton | Vite + Solid + router, FSD, Steiger, API client validating contracts, status page, i18n (en + pt-BR) | 🟦 |
| 4 | Database, CI, deploy | Postgres (Neon) via Kysely, plain SQL migrations, PGlite in tests, CORS/OPTIONS/HEAD, esbuild bundle + container image, `DatabaseProbe` port + fake, `/health` reading the DB (503 when degraded) and `/health/live`, GitHub Actions CI, deploy after green CI (API on Render, web on Cloudflare) | 🟥 |
| 5 | Minimal UI package | `@repo/ui` consumed from source: colour roles over a private palette held to WCAG contrast by a test, dark via `prefers-color-scheme`, a UnoCSS preset that offers only role colours, Button, Input and Field on Kobalte; status page with a "Check again" Button; design-system-first checks (no Kobalte and no literal colours in the web app) | 🟦 |
| 6 | Auth and authorization | JSON body reading (size limit, content type, schema validation), `identity` module, first repository port + in-memory fake, sessions, tenants (organization + member + role), guards, login/register screens, 401/403 handling, threat model | 🟥 |
| 7 | Reference vertical module | A small tenant-scoped CRUD end to end (contract → domain → API → web → e2e); the mould for future modules | 🟦 |
| 8 | E2E and quality | Playwright flow + axe, knip, coverage ratchet | 🟦 |
| 9 | Hardening and template use | Env validation, SECURITY.md, observability basics, "how to start a SaaS from this template" | 🟦 |

## Out of scope (specific to team-app)

Forecast/simulation, Jira sync, roadmap, calendar and capacity rules, demo data, golden numbers,
the 84-screen visual regression suite, full Storybook, mutation testing (may come later as an
option).

## Decisions taken

- Database: Postgres ([ADR 0003](adr/0003-postgres-as-the-database.md)).
- Data access: Kysely and plain SQL migrations, PGlite in tests ([ADR 0013](adr/0013-kysely-and-plain-sql-migrations.md)).
- Hosting: Neon, Render and Cloudflare Workers, deployed from GitHub Actions after green CI
  ([ADR 0014](adr/0014-hosting-and-deploy-from-github-actions.md)); free tiers checked on 2026-10-24.
- UI: a design system on Kobalte and UnoCSS, consumed from source, with role colours only
  ([ADR 0016](adr/0016-design-system-on-kobalte-and-unocss.md)); the web app builds from it first
  ([ADR 0017](adr/0017-build-the-web-ui-from-the-design-system-first.md)).
- Auth: decided at the start of Phase 6 (library vs. own implementation), in an ADR.
- Tool versions: pinned in Phase 0 from what is stable on the day.
