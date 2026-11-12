# Starting a SaaS from this template

From a new repository to the first feature of your own, deployed. Each step links the decision
behind it; read the ADR before changing what it settled.

## 1. Create the repository

On GitHub, **Use this template** → **Create a new repository** (it starts with one commit, without
this history). Then, locally:

```bash
git clone git@github.com:<owner>/<repo>.git && cd <repo>
nvm use && pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db    # in its own terminal
pnpm dev   # API :3001, web :5173
```

Open `http://localhost:5173`, sign up, and take the confirmation link from the API log (no email
provider is needed locally, [ADR 0021](adr/0021-send-email-through-a-provider-neutral-port.md)).
Everyday commands are in [CONTRIBUTING.md](../CONTRIBUTING.md).

## 2. Name the product

The template calls itself "Monorepo Template". Replace it in:

| Where | What |
| --- | --- |
| `apps/web/src/shared/config/i18n/dictionaries/shell/*.ts` | `app.name`, in every language |
| `apps/web/index.html`, `apps/web/public/favicon.svg` | The page title, the icon and its title |
| `apps/api/src/modules/identity/infrastructure/auth.ts` | The authenticator app's `issuer` |
| `apps/web/wrangler.jsonc` | The Worker's `name` (its `*.workers.dev` hostname) |
| `package.json`, `README.md`, `AGENTS.md` | The repository's name and what it is |
| `LICENSE` | The copyright holder (or another license) |
| `SECURITY.md` | Where reports go: private vulnerability reporting, or your contact |
| `.github/CODEOWNERS` | Who reviews each area: uncomment the rules and name your people or teams |
| `docs/security/threat-model.md` | Its scope and date, the hosts in the diagram, and the accepted risk on `*.<account>.workers.dev` once you have your own domain |

Tests that name the product follow (`pnpm test` lists them). The `@repo/*` package names are
internal and can stay.

## 3. Deploy

The defaults are Neon (Postgres), Render (the API's container) and Cloudflare Workers (the web and
the proxy to the API), on free tiers, deployed by GitHub Actions after CI passes on `main`
([ADR 0014](adr/0014-hosting-and-deploy-from-github-actions.md),
[ADR 0019](adr/0019-reach-the-api-through-the-web-worker.md)). Any Postgres and any container host
work; only `deploy.yml` and `wrangler.jsonc` know the providers.

1. Create the accounts: Neon, Render, Cloudflare, and Resend with a verified sending domain.
   Google sign-in is optional (an OAuth client whose redirect URI is
   `<web origin>/api/auth/callback/google`).
2. In GitHub, **Settings → Environments → `production`**, add:

   | Secrets | Variables |
   | --- | --- |
   | `DATABASE_URL` (with `sslmode=require`), `BETTER_AUTH_SECRET`, `PROXY_SECRET` (each `openssl rand -hex 32`), `RENDER_API_KEY`, `CLOUDFLARE_API_TOKEN`, `RESEND_API_KEY`, `GOOGLE_CLIENT_SECRET` | `API_ORIGIN`, `WEB_ORIGIN` (both `https://host`), `RENDER_SERVICE_ID`, `CLOUDFLARE_ACCOUNT_ID`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS` (empty) |

3. Push to `main`. The first run publishes the API image and stops at the configuration check: make
   the image's package public on GHCR, create a Render web service from it (free plan, health check
   path `/api/health/live`), set `RENDER_SERVICE_ID` and `API_ORIGIN`, and re-run the failed jobs.
4. The deploy ends with smoke tests: headers, the Worker, the API through it, and the `release` that
   answers `/api/health` ([ADR 0046](adr/0046-observe-through-structured-logs-tagged-with-the-release.md)).

## 4. Set up once

- Protect `main`: pull requests only, with the `CI` checks required, and code owner review once
  `.github/CODEOWNERS` names someone. Every pull request opens with the checklist of
  `.github/pull_request_template.md`.
- Dependency updates: install the [Renovate GitHub App](https://github.com/apps/renovate) on the
  repository; it reads `.github/renovate.json` and opens a dependency dashboard issue.
- Security reports: turn on private vulnerability reporting, or put your contact in
  [SECURITY.md](../SECURITY.md).
- An uptime monitor on `<web origin>/api/health`, and where to look when it fires:
  [operations.md](operations.md).
- Your own domain: the web already sends `Strict-Transport-Security` on every page
  (`apps/web/public/_headers`), so HTTPS holds there as it does on `workers.dev`. Its
  `includeSubDomains` reaches every name under the web's host: serve the web from a host whose
  subdomains all answer HTTPS. Add `preload` (and submit the domain at
  [hstspreload.org](https://hstspreload.org)) only when the web is on the apex domain and every
  subdomain has served HTTPS for a while: leaving the list takes months.
- A browser feature the app starts to use (camera, passkeys, fullscreen…) is allowed in the
  `Permissions-Policy` of `_headers` first; everything else stays off.

## 5. Build your first feature

Customers is the worked example of a tenant-scoped module, from contract to screen, with tests at
every layer ([ADR 0044](adr/0044-build-customers-as-the-reference-vertical-module.md), "How to copy
the module", [ADR 0052](adr/0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md)
for the unit of work, and [ADR 0055](adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md) for tenant isolation). Copy and rename it, in this order, each step test first (the `tdd-slice` skill):

1. The schemas in `packages/contracts`, and the resource in `statements` with the roles' share of it.
2. The domain: pure rules and errors, no I/O.
3. The repository port, its in-memory fake and the contract suite; the Kysely adapter and a new
   migration in `apps/api/migrations` (plain SQL, forward only,
   [ADR 0013](adr/0013-kysely-and-plain-sql-migrations.md)). Every tenant table, a child table
   included, has `organization_id text not null references auth."organization" ("id") on delete cascade`,
   and its migration ends with the three lines that put it behind row-level security
   ([ADR 0055](adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md)):

   ```sql
   alter table appointment enable row level security;
   create policy tenant_isolation on appointment to app_tenant
     using (organization_id = current_setting('app.organization_id', true));
   grant select, insert, update, delete on appointment to app_tenant;
   ```

   Without them the table is invisible to the API (`permission denied`), and
   `tenant-row-security.db.test.ts` names it. Add the table to `apps/api/test/reset-database.ts`.
4. A service and a controller per use case, the routes behind `requireMember`, one line in
   `app/create-app.ts`. Every use case, a read included, takes the module's unit of work and does
   its database work inside `run(organizationId, …)`, with the id the guard returned: Postgres then
   shows and accepts only that organization's rows, even for a query that forgot its `where`, and
   what the use case writes is kept together or not at all. Copy `customers-unit-of-work.port.ts`,
   `database/kysely-customers-unit-of-work.ts` (the only place that builds the adapters:
   `pnpm lint:deps` refuses one built in `create-app.ts`), `snapshot()` on each in-memory fake and
   `testing/customers-unit-of-work.contract.ts`. Inside `run`: only the repositories it hands
   over, and nothing but database work
   ([ADR 0052](adr/0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md)).
   Repository methods keep their own `where organization_id`: the fakes and any code on the pool
   (a job, a back office) have nothing else.
5. The web: the entity's reads and writes, the feature's forms, the page and its route with
   `preload`, the menu item, the texts in every language. Screens go through the `design-system`
   and `minimize-support` skills.
6. One end-to-end journey for the main path ([testing.md](testing.md)); edge cases stay below.

A product that does not need customers removes the module whole, with an ADR that says why. The
code goes the same way in both cases below:

1. `packages/contracts/src/customers.ts` and its export; the `customer` statement and each role's
   share of it in `packages/contracts/src/organizations.ts`.
2. `apps/api/src/modules/customers/` and its line in `app/create-app.ts`.
3. `apps/web/src/entities/customers/`, `features/customers/`, `pages/customers/`, the route in
   `app/routes.tsx`, the menu and palette items in `widgets/app-shell/`, and the `customers` texts
   and role descriptions in every locale (`dictionaries/customers/`, and its line in `locales/*.ts`).
4. `apps/e2e/tests/first-customer.spec.ts` (keep a journey that signs up and creates an
   organization), the screens of `accessibility.spec.ts`, and any icon of `packages/ui` only they
   used.

The database differs:

- **Never deployed** (no production database has run the migrations yet): delete
  `apps/api/migrations/0004_customers.sql`, `0006_customer_version.sql` and
  `0007_customer_change.sql`, and their tables in `apps/api/test/reset-database.ts`. Migrations are forward
  only once applied somewhere ([ADR 0013](adr/0013-kysely-and-plain-sql-migrations.md)); before
  that, the files are just code. Reset the local database: stop `pnpm db`, delete `apps/api/.data`, start it again.
- **Already in production**: keep the files, which databases have already applied, and add a new
  migration that drops the tables (`drop table if exists customer_change; drop table if exists customer;`). Back up the rows first if anyone might want them.

In both cases keep the first half of `0009_tenant_row_security.sql` (the `app_tenant` role and its
grants), which every later tenant table needs; when deleting the customers migrations, delete only
its lines about `customer` and `customer_change`.

### Texts and languages

Texts live in `apps/web/src/shared/config/i18n/dictionaries/<group>/<language>.ts`, one file per module and
language ([ADR 0058](adr/0058-split-the-i18n-dictionaries-by-slice-and-merge-them-per-language.md)). The
`locales/*.ts` files only merge them.

A new module adds its texts like this, and edits no other module's file:

1. `dictionaries/<module>/en.ts` exports `<module>En`, an object of top-level keys no other group uses.
2. `es.ts` and `pt-BR.ts` beside it export `<module>Es` and `<module>PtBR`, typed `typeof <module>En`, so a key
   missing in one language fails `pnpm typecheck` in that file.
3. One import and one `...<module>En` line in each of `locales/en.ts`, `es.ts` and `pt-BR.ts` (the only shared
   edit, two adjacent lines). A group left out of the merge fails `dictionaries.test.ts` and the screens that
   use its keys.

If the test says a key has no group right after you add one, run it again after touching
`dictionaries.test.ts`: Vitest keeps the list of files its glob found.

A product that does not sell in a language (say `es`) removes it in these places:

1. `apps/web/src/shared/config/i18n/locales/es.ts` and every `dictionaries/*/es.ts`.
2. `messages.ts`: its line in `loaders` and in `localeNames`; `detect-locale.ts`: its branch.
3. The tests that name it (`messages.test.ts`, `context.test.tsx`, `detect-locale.test.ts`, and any page test
   that renders in it).
4. `apps/api/src/modules/identity/emails/locales/es.ts` and its line in `emails/email-texts.ts`: emails are
   written in the language chosen at sign-up, so a language the web no longer offers must go there too.
5. The API tests that sign up in it (`authentication.db.test.ts`, `organizations.db.test.ts`,
   `account-deletion.db.test.ts` use `pt-BR`; check the others with `grep -rn "'es'" apps`).

Then run the whole definition of done: the typecheck names anything left behind. Adding a language is the same
list backwards: a file per group, a line in `loaders` and `localeNames`, a branch in `detect-locale.ts`, and the
emails.

## 6. Keep it healthy

- Every change ends green: `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps &&
  pnpm lint:fsd && pnpm knip && pnpm test:e2e` (100% coverage, [AGENTS.md](../AGENTS.md)).
- One decision, one ADR (`write-adr`); a change to a flow, a provider or a trust boundary updates
  the [threat model](security/threat-model.md) in the same pull request.
- Dependencies: versions live in the pnpm catalog (`pnpm-workspace.yaml`). Renovate proposes the
  updates ([ADR 0051](adr/0051-propose-dependency-updates-with-renovate.md)); review them in this
  order: Better Auth first (read its release notes and the threat model rows it touches), then a
  runtime minor or major (its changelog, then the screens or routes it drives), then runtime
  patches, then dev tooling, Action SHAs and the image digest (green CI is enough). A new runtime
  dependency joins the runtime list in `.github/renovate.json`. A weekly `pnpm audit` runs in CI.
- Releases: an annotated tag (`v1.2.0`) on `main` when it means something; no release tooling.

Waiting for a trigger:

- Solid 2 and Kobalte 2: migrate when Kobalte 2 leaves alpha (2.0.0-alpha.4 on 2026-11-07).
- Error tracking, metrics and tracing: the signals in [ADR 0046](adr/0046-observe-through-structured-logs-tagged-with-the-release.md).
