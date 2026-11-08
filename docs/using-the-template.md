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

- Protect `main`: pull requests only, with the `CI` checks required.
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
the module"). Copy and rename it, in this order, each step test first (the `tdd-slice` skill):

1. The schemas in `packages/contracts`, and the resource in `statements` with the roles' share of it.
2. The domain: pure rules and errors, no I/O.
3. The repository port, its in-memory fake and the contract suite; the Kysely adapter and a new
   migration in `apps/api/migrations` (plain SQL, forward only,
   [ADR 0013](adr/0013-kysely-and-plain-sql-migrations.md)).
4. A service and a controller per use case, the routes behind `requireMember`, one line in
   `app/create-app.ts`.
5. The web: the entity's reads and writes, the feature's forms, the page and its route with
   `preload`, the menu item, the texts in every language. Screens go through the `design-system`
   and `minimize-support` skills.
6. One end-to-end journey for the main path ([testing.md](testing.md)); edge cases stay below.

A product that does not need customers removes the module whole: its contract, API module and
migration (with a new migration that drops the table), web slices, texts, fixtures and the
`customer` statements, with an ADR that says why.

## 6. Keep it healthy

- Every change ends green: `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps &&
  pnpm lint:fsd && pnpm knip && pnpm test:e2e` (100% coverage, [AGENTS.md](../AGENTS.md)).
- One decision, one ADR (`write-adr`); a change to a flow, a provider or a trust boundary updates
  the [threat model](security/threat-model.md) in the same pull request.
- Dependencies: versions live in the pnpm catalog (`pnpm-workspace.yaml`); check them with
  `pnpm outdated -r`. A weekly `pnpm audit` runs in CI.
- Releases: an annotated tag (`v1.2.0`) on `main` when it means something; no release tooling.

Waiting for a trigger:

- Solid 2 and Kobalte 2: migrate when Kobalte 2 leaves alpha (2.0.0-alpha.4 on 2026-11-07).
- Renovate: when the manual dependency checks slip.
- Error tracking, metrics and tracing: the signals in [ADR 0046](adr/0046-observe-through-structured-logs-tagged-with-the-release.md).
