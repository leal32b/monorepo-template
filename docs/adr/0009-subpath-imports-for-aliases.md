# 0009. Subpath imports (`#...`) for path aliases

- Status: accepted
- Date: 2026-10-17

## Context and problem statement

Imports such as `../../../../libs/ports/clock.port` are noisy and break when files move. A path
alias is needed. Where is it defined?

## Decision drivers

- One source of truth, understood by every tool in the chain (Node, tsx, Vitest, TypeScript,
  bundlers, dependency-cruiser).
- No plugin to install or keep in sync.

## Considered options

1. `tsconfig` `paths`, mirrored in each bundler/runtime.
2. Node.js subpath imports: the `imports` field of `package.json`.

## Decision outcome

Chosen option 2. In `apps/api/package.json`: `"imports": { "#*": "./src/*.ts" }`, so
`#libs/ports/clock.port` resolves to `./src/libs/ports/clock.port.ts`. It is a Node standard, so
the runtime and the tooling agree without configuration.

Convention: inside the same use-case folder, short relative imports (`./get-health.service`);
across folders, the alias (`#libs/...`, `#modules/...`, `#app/...`, `#config/...`). Aliases are
local to a package; only workspace package names (`@repo/*`) cross packages.

### Consequences

- Good: no duplicated alias configuration; moving a file does not break its neighbours.
- Bad: every folder under `src/` becomes an alias automatically; `#` is mandatory by the spec.

## Revisit when

A tool in the chain stops honouring `imports`.
