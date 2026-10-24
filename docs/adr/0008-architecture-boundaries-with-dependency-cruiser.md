# 0008. Architecture boundaries enforced by dependency-cruiser

- Status: accepted
- Date: 2026-10-17

## Context and problem statement

A declared architecture that nothing enforces erodes: a domain file importing the database, or a
`libs/` file importing a module, passes review unnoticed. How are the boundaries of
[ADR 0006](0006-api-architecture.md) kept?

## Decision drivers

- Rules follow real module resolution (aliases, re-exports, workspace packages), not import text.
- A violation fails CI with the name of the rule.
- Few tools to keep in sync.

## Considered options

1. dependency-cruiser on the resolved graph.
2. Biome `noRestrictedImports` only (import text).
3. ESLint with a boundaries plugin (rejected: the repository standardises on Biome).

## Decision outcome

Chosen option 1, run by `pnpm lint:deps` (config: `.dependency-cruiser.cjs`).

| Rule | Guards |
| --- | --- |
| `no-circular`, `not-to-unresolvable` | Cycles and imports that do not resolve |
| `no-non-package-json` | A workspace imports only what its own `package.json` declares |
| `not-to-dev-dep` | Production code never imports devDependencies |
| `api-libs-are-generic` | `libs/` never imports `modules/` or `app/` |
| `api-modules-not-to-app` | Modules never import the composition root (no service locator) |
| `api-modules-talk-through-index` | A module reaches another only through its `index.ts` |
| `api-domain-is-pure`, `api-domain-no-io-builtins` | Domain imports no outer layer and no I/O or crypto built-ins |
| `api-use-cases-depend-on-ports` | Use cases and controllers depend on `*.port.ts`, not on adapters |
| `apps-are-independent` | An app never imports another app (they share only packages) |
| `packages-not-to-apps` | Packages never import apps |

FSD rules for the web are not here: Steiger is their single authority
([ADR 0010](0010-web-architecture-feature-sliced-design.md)).

dependency-cruiser parses TypeScript with `@swc/core` (`parser: 'swc'`) because it does not
support the TypeScript 7 compiler API yet; swc keeps type-only imports, so type cycles are still
found. Subpath imports (`#...`) are resolved by the default resolver.

Each rule was proven by introducing a violation on purpose and watching the gate fail. The
domain-purity rules take effect when the first `domain/` and `database/` folders exist; a
test that scans domain code for clock, randomness and process reads is added with the first
domain file.

### Consequences

- Good: an architectural regression fails CI with a message naming the rule.
- Bad: `@swc/core` is a native dependency used only by tooling.
- Bad: rules for folders that do not exist yet are untested until those folders appear.

## Revisit when

dependency-cruiser supports TypeScript 7 (drop `@swc/core`), or Biome gains graph-aware
boundary rules (add editor feedback with `noRestrictedImports`).
