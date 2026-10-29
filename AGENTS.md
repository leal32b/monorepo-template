# AGENTS.md — monorepo-template

Guide for AI agents (and people) working in this repository.

## What this is

A template for any new SaaS: a small, fast, elegant architecture that is ready to scale. It is
built step by step around a **tracer bullet** (one thin slice that crosses every layer, deployed
for real) and is modelled on the architecture of the `team-app` repository, without any of its
product-specific features.

The build order lives in [`docs/plan.md`](docs/plan.md). Decisions live in
[`docs/adr/`](docs/adr/README.md).

## Layout (target)

```
apps/api/            # Hexagonal modules, plain node:http, Postgres
apps/web/            # SolidJS + Vite, Feature-Sliced Design
apps/e2e/            # Playwright
packages/contracts/  # Zod schemas + inferred types shared by API and web
packages/ui/         # Design system (Solid + Kobalte + UnoCSS)
docs/                # plan, adr
```

Folders appear only when their phase of the plan reaches them.

## Working agreement (how we build)

- **Teaching mode.** The owner creates each file; the agent explains the concept, links the
  official documentation, reviews, and runs the checks. Do not dump a whole phase at once.
- **TDD.** A rule or a bug starts with a failing test (red), then the smallest change (green),
  then cleanup. Use the [`tdd-slice`](.claude/skills/tdd-slice/SKILL.md) skill.
- **One decision, one ADR.** Use the [`write-adr`](.claude/skills/write-adr/SKILL.md) skill.
- **Minimal scope.** Only what the current phase asks for; no collateral refactors; no
  feature of the reference repository that the plan does not list.
- **Commit only when asked.** Conventional Commits.
- **Model hint.** Say so when a step deserves Opus (auth and tenancy, deploy and database
  decisions); everything else is fine on Sonnet.

## Fixed conventions

- **Node.js 26**, **pnpm** workspaces without a task runner ([ADR 0002](docs/adr/0002-pnpm-workspaces-without-a-task-runner.md)).
- **TypeScript**, **Biome** (not ESLint/Prettier), **Vitest**. `@types/node` stays on the major of `.node-version`.
- **Versions** live in the pnpm catalog of `pnpm-workspace.yaml`; package.json files say `catalog:`.
- **Imports:** aliases are Node subpath imports (`#libs/...`) inside a package ([ADR 0009](docs/adr/0009-subpath-imports-for-aliases.md)); a package declares every dependency it imports.
- **API:** plain `node:http`, no Express/Fastify; domain is pure (no I/O, clock or randomness);
  use cases in `commands|queries/<use-case>/`; `GET` never writes.
- **Web:** FSD checked by Steiger ([ADR 0010](docs/adr/0010-web-architecture-feature-sliced-design.md)):
  imports go downwards only, slices and `shared` segments are reached through their `index.ts`.
- **`index.ts` files contain re-exports only** (they are excluded from coverage).
- **UI:** screens compose `@repo/ui` ([ADR 0017](docs/adr/0017-build-the-web-ui-from-the-design-system-first.md));
  a missing component is added there, with tests. Colours are roles only (`bg-primary`,
  `text-muted-foreground`), held to WCAG contrast ([ADR 0016](docs/adr/0016-design-system-on-kobalte-and-unocss.md));
  no Kobalte import and no literal colour in `apps/web`.
- **i18n:** UI text lives in typed dictionaries, one file per language ([ADR 0011](docs/adr/0011-typed-i18n-dictionaries.md)).
- **Contracts:** every request/response is a Zod schema in `@repo/contracts`, except `/api/auth/*`,
  which keeps Better Auth's shapes ([ADR 0020](docs/adr/0020-authenticate-with-better-auth.md)).
- **Auth:** `better-auth` stays in `modules/identity/infrastructure/` (dependency-cruiser checks it).
  A route that needs a session calls `requireActor` from `#modules/identity/index` and gets an
  `Actor` or a 401; it never refreshes the session.
- **Database:** Postgres ([ADR 0003](docs/adr/0003-postgres-as-the-database.md)).
- **Language:** code, comments and docs in English; conversation with the owner in pt-BR.

## Definition of done

Each phase ends green and committed. Today:

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps && pnpm lint:fsd
```

Coverage thresholds are 100% from the start.

As gates are introduced (knip, e2e) they join this list. Architecture rules are in
[ADR 0006](docs/adr/0006-api-architecture.md), [ADR 0008](docs/adr/0008-architecture-boundaries-with-dependency-cruiser.md),
[ADR 0010](docs/adr/0010-web-architecture-feature-sliced-design.md) and
[ADR 0017](docs/adr/0017-build-the-web-ui-from-the-design-system-first.md). `pre-push` runs typecheck,
tests, `lint:deps` and `lint:fsd` in parallel.
