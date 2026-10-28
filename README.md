# monorepo-template

A template for a new SaaS: a TypeScript monorepo with an API on plain `node:http` and Postgres, a
SolidJS web app, shared Zod contracts and a small design system. It is built step by step around
a tracer bullet and deployed for real on free tiers (Neon, Render, Cloudflare).

| Folder | What it holds |
| --- | --- |
| `apps/api` | Hexagonal modules on `node:http`, Kysely and plain SQL migrations |
| `apps/web` | SolidJS and Vite, Feature-Sliced Design |
| `packages/contracts` | Zod schemas shared by the API and the web |
| `packages/ui` | Design system on Kobalte and UnoCSS |
| `docs` | Build plan and architecture decisions |

- Setup and everyday commands: [CONTRIBUTING.md](CONTRIBUTING.md)
- Conventions and definition of done: [AGENTS.md](AGENTS.md)
- Build order: [docs/plan.md](docs/plan.md)
- Decisions: [docs/adr](docs/adr/README.md); the first deploy is in
  [ADR 0014](docs/adr/0014-hosting-and-deploy-from-github-actions.md)
