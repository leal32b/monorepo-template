# monorepo-template

A starting point for a new SaaS: a TypeScript monorepo with sign-up, organizations, roles and one
complete reference module already built, tested at every layer and deployed on free tiers. A product
starts from it by renaming, deploying and copying the reference module, not by writing auth or
plumbing.

## What you get

**For the people using the product**

- Sign-up with a confirmed email, sign-in, password reset, Google sign-in, two-step verification
  with an authenticator app and backup codes; breached passwords refused, attempts rate-limited.
- Organizations: create and switch, invite people by email, members, built-in and custom roles with
  permissions; each organization's data behind a guard that answers 404 to outsiders.
- Customers, a tenant-scoped module (list, search, create, edit, archive, restore, delete) to copy
  for the product's own entities.
- One app frame with a side menu and a command palette, mobile first, light and dark themes,
  English, Portuguese and Spanish, accessible (axe on every screen), fast on a cold start (a
  JavaScript budget per load).

**For the people building it**

- An API on plain `node:http`: hexagonal modules, a pure domain, use cases as slices, ports with
  in-memory fakes, RFC 9457 problem responses with a request id.
- Shared Zod contracts: the API and the web validate the same schemas.
- A web app in SolidJS organized by Feature-Sliced Design, built only from the design system.
- Architecture rules enforced by tools (dependency-cruiser, Steiger, knip), 100% coverage, browser
  journeys on the production build, all offline.
- Deploy from GitHub Actions after green CI, with smoke tests; JSON logs tagged with the release.
- Every choice recorded as an ADR (46 so far), and a threat model kept current.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime and tooling | Node.js 26, pnpm workspaces, TypeScript, Biome, Vitest, Lefthook, commitlint |
| API | `node:http`, Kysely, plain SQL migrations, Better Auth, pino |
| Database | Postgres; PGlite in tests and local development |
| Web | SolidJS, Solid Router, Vite, typed i18n dictionaries |
| Design system | Kobalte, UnoCSS, Phosphor icons, colour roles held to WCAG contrast |
| Contracts | Zod Mini |
| End to end | Playwright, axe |
| Hosting (defaults) | Neon (Postgres), Render (API container), Cloudflare Workers (web and proxy), Resend (email) |

Any Postgres and any container host work: only `deploy.yml` and `wrangler.jsonc` know the providers.

## How it fits together

```
Browser ──▶ Cloudflare Worker (web origin)
              ├─ static assets, CSP and security headers
              └─ /api/* ──secret header──▶ API (node:http) ──▶ Postgres
                                            └─▶ email provider, Google
```

The browser talks only to the web origin, so the session cookie is first-party; the API accepts
requests only from the Worker ([ADR 0019](docs/adr/0019-reach-the-api-through-the-web-worker.md),
[ADR 0022](docs/adr/0022-accept-api-requests-only-from-the-web-worker.md)).

## Quick start

Requires Node.js 26 (`nvm use`) and pnpm.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db    # local Postgres (PGlite) on :5433, in its own terminal
pnpm dev   # migrations, then the API on :3001 and the web on :5173
```

Open `http://localhost:5173` and sign up; the confirmation link appears in the API's log. Every
command is listed in [CONTRIBUTING.md](CONTRIBUTING.md).

## Repository

| Folder | What it holds |
| --- | --- |
| `apps/api` | Modules `health`, `identity` and `customers`; the HTTP pipeline; migrations |
| `apps/web` | The SolidJS app and the Worker that serves it and proxies `/api/*` |
| `apps/e2e` | Playwright: browser journeys, accessibility and the JavaScript budget |
| `packages/contracts` | Zod schemas shared by the API and the web |
| `packages/ui` | The design system |
| `docs` | The guides below and the architecture decisions |

## Quality gates

A change is done when this passes; `pre-push` runs most of it and CI runs all of it:

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps && pnpm lint:fsd && pnpm knip && pnpm test:e2e
```

## Documentation

| Read | When |
| --- | --- |
| [Starting a SaaS from this template](docs/using-the-template.md) | Creating a product: naming, first deploy, first feature |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setting up and working day to day |
| [AGENTS.md](AGENTS.md) | Conventions and the definition of done, for people and AI agents |
| [Testing](docs/testing.md) | Choosing the layer for a test, writing an end-to-end test |
| [Operations](docs/operations.md) | Reading logs, health checks, handling an incident, rolling back |
| [Architecture decisions](docs/adr/README.md) | Before changing anything an ADR settled |
| [Threat model](docs/security/threat-model.md) | Changing a flow, a provider or a trust boundary |
| [SECURITY.md](SECURITY.md) | Reporting a vulnerability |

## License

[MIT](LICENSE)
