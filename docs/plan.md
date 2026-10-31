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
| 5.5 | Pre-auth review | Coverage gate measures `.tsx` (Solid HMR off in tests) and runs on pre-push; boundary rules as allowlists (`libs/database` guarded, no npm package in the domain); migration lock per transaction, safe behind any pooler; one pnpm catalog for every version; immutable cache for hashed assets and baseline security headers, checked by the deploy smoke test; session path decided; README | 🟥 |
| 6 | Authentication | [Threat model](security/threat-model.md); the web Worker proxying `/api/*` with a shared secret ([ADR 0019](adr/0019-reach-the-api-through-the-web-worker.md), [ADR 0022](adr/0022-accept-api-requests-only-from-the-web-worker.md)), 404 for missing assets, full CSP; JSON body reading (size limit, content type, schema validation), CSRF checked by `Sec-Fetch-Site`/`Origin`, API security headers; email through a port with log and Resend adapters ([ADR 0021](adr/0021-send-email-through-a-provider-neutral-port.md)); Better Auth at `/api/auth/*` ([ADR 0020](adr/0020-authenticate-with-better-auth.md)): email and password with a confirmed email, password reset, Google sign-in, TOTP and backup codes, rate limiting, migrations in the `auth` schema; a current-session port and a 401 guard; sign-up, sign-in, email confirmation, password reset, MFA and account security screens; weekly `pnpm audit` in CI | 🟥 |
| 6.5 | Organizations and authorization | Better Auth's organization plugin: organizations, members, roles and custom permissions, invitations by email; a tenant guard on the path (`/api/organizations/:id/...`: 404 for non-members, 403 without the permission); organization screens (create, switch, members, invite, accept) | 🟥 |
| 7 | Reference vertical module | A small tenant-scoped CRUD end to end (contract → domain → API → web → e2e), with the first repository port and its in-memory fake; the mould for future modules | 🟦 |
| 8 | E2E and quality | Playwright flow + axe, knip, coverage ratchet, bundle budget (settles `zod` against `zod/mini`) | 🟦 |
| 9 | Hardening and template use | SECURITY.md, observability basics, "how to start a SaaS from this template" | 🟦 |

## Out of scope (specific to team-app)

Forecast/simulation, Jira sync, roadmap, calendar and capacity rules, demo data, golden numbers,
the 84-screen visual regression suite, full Storybook, mutation testing (may come later as an
option).

## Decisions taken

- Database: Postgres ([ADR 0003](adr/0003-postgres-as-the-database.md)).
- Data access: Kysely and plain SQL migrations, PGlite in tests ([ADR 0013](adr/0013-kysely-and-plain-sql-migrations.md));
  the migration lock is taken inside each transaction, safe behind any pooler
  ([ADR 0018](adr/0018-take-the-migration-lock-inside-each-transaction.md)).
- Hosting: Neon, Render and Cloudflare Workers, deployed from GitHub Actions after green CI
  ([ADR 0014](adr/0014-hosting-and-deploy-from-github-actions.md)); free tiers checked on 2026-10-24.
- UI: a design system on Kobalte and UnoCSS, consumed from source, with role colours only
  ([ADR 0016](adr/0016-design-system-on-kobalte-and-unocss.md)); the web app builds from it first
  ([ADR 0017](adr/0017-build-the-web-ui-from-the-design-system-first.md)).
- Session path: the web Worker proxies `/api/*`, so the session cookie is first-party on the
  default hostnames ([ADR 0019](adr/0019-reach-the-api-through-the-web-worker.md)).
- Auth: Better Auth at `/api/auth/*`, behind our own ports, with its organization plugin in
  Phase 6.5 ([ADR 0020](adr/0020-authenticate-with-better-auth.md)); the API accepts only the web
  Worker ([ADR 0022](adr/0022-accept-api-requests-only-from-the-web-worker.md)); email goes
  through a provider-neutral port ([ADR 0021](adr/0021-send-email-through-a-provider-neutral-port.md));
  the authenticator's QR code is drawn in the browser
  ([ADR 0023](adr/0023-draw-the-authenticator-qr-code-in-the-browser.md)).
  Threats and accepted risks: [threat model](security/threat-model.md).
- Tool versions: one pnpm catalog in `pnpm-workspace.yaml`, set from what is stable on the day.
  Updates are checked by hand (`pnpm outdated -r`); Dependabot cannot read the pnpm 12 lockfile.
  From Phase 6, a weekly `pnpm audit --audit-level high` runs in CI (`.github/workflows/audit.yml`),
  because authentication now comes from a library.
- Versioning: an annotated tag per phase (`v0.5.0` for Phase 5), no release tooling.

## Waiting for a trigger

- Solid 2 and Kobalte 2: migrate when Kobalte 2 leaves alpha, before Phase 7 if it can, so the
  reference module is not born on Solid 1.
- Renovate: when the manual dependency checks slip or the template gets users.
