# 0004. Tooling: TypeScript, Biome, Vitest and Git hooks

- Status: accepted
- Date: 2026-10-16

## Context and problem statement

Quality gates should exist before the first line of product code, run the same locally and in CI,
and cost almost nothing to maintain. Which tools, and how strict?

## Decision drivers

- Few tools, fast feedback, one configuration language where possible.
- Strictness decided once, at the root, and inherited.
- Bad commits are stopped before they reach the history.

## Considered options

1. Biome (lint + format), Vitest, strict shared `tsconfig.base.json`, Lefthook + commitlint.
2. ESLint + Prettier, Jest, Husky + lint-staged.
3. No hooks; rely on CI only.

## Decision outcome

Chosen option 1.

- **TypeScript** strict, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `verbatimModuleSyntax`, in `tsconfig.base.json`; every package extends it.
- **Biome** replaces ESLint and Prettier: one tool, one config, much faster. Its
  `noRestrictedImports` is the first layer of the architecture gates added in later phases.
- **Vitest** shares the Vite pipeline used by the web app; one root run covers the workspace.
- **Lefthook** (single binary) runs Biome on staged files before commit, **commitlint** enforces
  Conventional Commits, and `typecheck` + `test` run before push. CI repeats the same checks, so
  hooks are a convenience, not a guarantee.
- pnpm 12 blocks install scripts by default; `allowBuilds` in `pnpm-workspace.yaml` lists the
  few that are allowed (currently `lefthook`).

### Consequences

- Good: one command per concern (`pnpm lint`, `typecheck`, `test`), same in CI.
- Good: a consistent history (Conventional Commits) that can drive changelogs later.
- Bad: Biome's rule set is smaller than ESLint's ecosystem; framework-specific rules (Solid) may
  be missing.
- Bad: hooks can be bypassed with `--no-verify`; CI is the real gate.

## Revisit when

A rule we need exists only in ESLint plugins, or hooks slow commits noticeably.
