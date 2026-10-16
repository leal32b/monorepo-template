# 0002. Use pnpm workspaces without a task runner

- Status: accepted
- Date: 2026-10-16

## Context and problem statement

The repository holds several apps and packages that depend on each other. How are they linked,
built and tested?

## Decision drivers

- As few moving parts as possible; a newcomer reads the whole setup in minutes.
- Fast feedback locally and in CI.
- Room to grow without a rewrite.

## Considered options

1. pnpm workspaces; scripts at the root call `pnpm -r` / `--filter`; Vitest projects run tests
   from the root.
2. pnpm workspaces + Turborepo or Nx (task graph, remote cache).
3. npm or yarn workspaces.

## Decision outcome

Chosen option 1. A task runner earns its place when builds are slow enough that caching matters;
with a handful of packages it is configuration without payoff. pnpm gives strict dependency
isolation (no phantom dependencies) and the `workspace:*` protocol.

### Consequences

- Good: one tool, no extra config language, trivial CI.
- Bad: no build cache or affected-only runs; CI time grows with the repository.

## Revisit when

CI exceeds ~10 minutes mainly because of repeated builds or tests, or packages pass ~15.
