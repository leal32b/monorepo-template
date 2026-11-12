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
| `apps/web/src/shared/config/i18n/locales/*.ts` | `app.name`, in every language |
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
4. Background jobs run inside the API process, which is all a free tier's single container allows
   ([ADR 0056](adr/0056-run-background-work-from-a-job-table-in-postgres.md)). On a paid plan they
   can have a service of their own: the same image and variables with the command
   `node --enable-source-maps dist/worker.js` and `JOB_IDLE_POLL_SECONDS=5`, and `JOB_WORKER=off` on
   the API. The deploy workflow does not create that service or set those variables: add them to it.
5. The deploy ends with smoke tests: headers, the Worker, the API through it, and the `release` that
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
the module", and [ADR 0052](adr/0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md)
for a use case with two writes). Copy and rename it, in this order, each step test first (the `tdd-slice` skill):

1. The schemas in `packages/contracts`, and the resource in `statements` with the roles' share of it.
2. The domain: pure rules and errors, no I/O.
3. The repository port, its in-memory fake and the contract suite; the Kysely adapter and a new
   migration in `apps/api/migrations` (plain SQL, forward only,
   [ADR 0013](adr/0013-kysely-and-plain-sql-migrations.md)).
4. A service and a controller per use case, the routes behind `requireMember`, one line in
   `app/create-app.ts`. A use case with one write takes the repository, as `ArchiveCustomerService`
   does. One whose writes must be kept together or not at all (a sale and its items, an appointment
   and its charge) takes the module's unit of work and does everything inside `run`, as
   `DeleteCustomerService` does: copy `customers-unit-of-work.port.ts`,
   `database/kysely-customers-unit-of-work.ts`, `snapshot()` on each in-memory fake and
   `testing/customers-unit-of-work.contract.ts`. Inside `run`: only the repositories it hands
   over, and nothing but database work
   ([ADR 0052](adr/0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md)).
5. Work for later, if the feature has any (a reminder at a time, a call to a provider that may
   fail, anything too slow for a request): a job
   ([ADR 0056](adr/0056-run-background-work-from-a-job-table-in-postgres.md)), below.
6. The web: the entity's reads and writes, the feature's forms, the page and its route with
   `preload`, the menu item, the texts in every language. Screens go through the `design-system`
   and `minimize-support` skills.
7. One end-to-end journey for the main path ([testing.md](testing.md)); edge cases stay below.

### A job kind

`modules/health/jobs/queue-check.ts` is the smallest example. A module with background work has
three pieces:

1. **The definition**, in the module (`jobs/<what-it-does>.ts`): a name and the schema of its
   payload. The payload is stored as JSON and kept until the purge: carry ids, not records.

   ```ts
   export const sendReminder: JobDefinition<{ organizationId: string; appointmentId: string }> = {
     kind: 'appointments.send-reminder',
     schema: z.object({ organizationId: z.string(), appointmentId: z.string() })
   }
   ```

2. **The handler**, registered by the module's `registerXJobs(registrar, deps)`, which
   `app/create-jobs.ts` calls with the ports the handlers need, as `create-app.ts` does for routes:

   ```ts
   export function registerAppointmentJobs(registrar: JobRegistrar, deps: { reminders: SendReminderService }): void {
     registrar.register(sendReminder, (payload, { signal }) => deps.reminders.execute(payload, signal))
   }
   ```

   A handler may run more than once for the same job (a crash, a retry after the effect happened):
   make it bear a repeat, by checking what it already did or writing with a key. Throwing asks for a
   retry (five attempts over about 43 minutes, then the job stays as `failed`). It has 60 s: pass
   `signal` to what it waits on, and split longer work into several jobs. Its database work goes
   through the same ports as a request; tenant work opens the unit of work with the organization
   from the payload.

3. **The enqueue**, from a use case, through the `JobQueue` port:
   `await jobs.enqueue(sendReminder, { organizationId, appointmentId }, { runAt })`. With the change
   that causes it, add `jobs: JobQueue` to the module's unit of work (`jobs: jobs.bind(transaction)`
   in its Kysely factory, `createJobs(...).bind`): the job is then kept or dropped with the
   transaction. Outside one, the use case takes `createJobs(...).queue`.

Tests: a use case takes `InMemoryJobs` (`#libs/adapters/in-memory-jobs`), which a unit of work rolls
back like any fake, and asserts on `jobs.all`; to run what was enqueued, build a `JobWorker` on it
with `ManualTimer` and call `drain()`, as `queue-check.test.ts` does. What to look at in production:
[operations.md](operations.md#background-jobs).

A product that does not need customers removes the module whole, with an ADR that says why. The
code goes the same way in both cases below:

1. `packages/contracts/src/customers.ts` and its export; the `customer` statement and each role's
   share of it in `packages/contracts/src/organizations.ts`.
2. `apps/api/src/modules/customers/` and its line in `app/create-app.ts`.
3. `apps/web/src/entities/customers/`, `features/customers/`, `pages/customers/`, the route in
   `app/routes.tsx`, the menu and palette items in `widgets/app-shell/`, and the `customers` texts
   and role descriptions in every locale.
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
