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
| 4 | Database, CI, deploy | Postgres (Neon), migrations, repository port + in-memory fake, GitHub Actions, API + web deployed, `/health` reading the DB in production | 🟥 |
| 5 | Minimal UI package | Tokens, Button, Input, Field on Kobalte + UnoCSS, design-system-first rule | 🟦 |
| 6 | Auth and authorization | `identity` module, sessions, tenants (organization + member + role), guards, login/register screens, 401/403 handling, threat model | 🟥 |
| 7 | Reference vertical module | A small tenant-scoped CRUD end to end (contract → domain → API → web → e2e); the mould for future modules | 🟦 |
| 8 | E2E and quality | Playwright flow + axe, knip, coverage ratchet, deploy after green CI | 🟦 |
| 9 | Hardening and template use | Env validation, SECURITY.md, observability basics, "how to start a SaaS from this template" | 🟦 |

## Out of scope (specific to team-app)

Forecast/simulation, Jira sync, roadmap, calendar and capacity rules, demo data, golden numbers,
the 84-screen visual regression suite, full Storybook, mutation testing (may come later as an
option).

## Decisions taken

- Database: Postgres ([ADR 0003](adr/0003-postgres-as-the-database.md)).
- Hosting: web on a static host (Cloudflare Pages or Vercel), API on a free container host
  (Render or Koyeb). Confirmed in Phase 4 against the free tiers of that day.
- Auth: decided at the start of Phase 6 (library vs. own implementation), in an ADR.
- Tool versions: pinned in Phase 0 from what is stable on the day.
