# 0010. Structure the web app with Feature-Sliced Design, checked by Steiger

- Status: accepted
- Date: 2026-10-24

## Context and problem statement

The web app will grow screen by screen. Without a structure, imports go in every direction and
business rules hide inside components. Which structure, and how is it kept?

## Decision drivers

- A reviewer finds any screen, action or rule by its folder.
- Imports go one way, so a change in one screen does not ripple into another.
- The structure is checked by a tool, not by memory.
- One source of truth per concern; no parallel rule sets to keep in sync.

## Considered options

1. Folders by technical kind (`components/`, `hooks/`, `services/`).
2. One folder per screen.
3. Feature-Sliced Design (FSD), checked by Steiger, its official linter.

## Decision outcome

Chosen option 3.

| Layer | Holds | In the template |
| --- | --- | --- |
| `app` | Providers, router, composition | `app/app.tsx`, `main.tsx` |
| `pages` | One slice per route: composition and its states | `pages/home` |
| `widgets` | Self-contained blocks of a page | `widgets/api-status` |
| `features` | User actions | (none yet) |
| `entities` | Business objects as the UI shows them | `entities/health` |
| `shared` | No business: `api`, `config`, `lib`, `ui` segments | `shared/api`, `shared/config` |

- A layer imports only the layers below it; a slice (and each `shared` segment) is reached only
  through its `index.ts`, which contains re-exports only. Rules live in a slice's `model/` or
  `lib/` with unit tests.
- Inside a package, aliases are Node subpath imports ([ADR 0009](0009-subpath-imports-for-aliases.md)):
  `"#*": "./src/*/index.ts"`, so an alias can only ever reach a public API.
- **Steiger is the single authority for FSD** (`pnpm lint:fsd`): layer direction, cross-slice
  imports, public API and structure. dependency-cruiser keeps the rules that are not FSD (cycles,
  declared dependencies, `apps-are-independent`) and no longer repeats FSD rules
  ([ADR 0008](0008-architecture-boundaries-with-dependency-cruiser.md)). An earlier version of
  this record's work kept both; they disagreed once about `shared`, and Steiger was right.
- `fsd/insignificant-slice` is off: slices are cut by business capability, not by reuse count.
- The API client (`shared/api`) is injected through a context, never a global; components get
  their dependencies from providers, the web counterpart of the API's composition root.

### Consequences

- Good: a predictable place for everything, boundaries checked in CI, rules testable alone.
- Bad: more folders and `index.ts` files than a tiny app strictly needs.
- Bad: Steiger is 0.x software; it is the only guard of layer direction.

## Revisit when

Steiger lets a layer violation through (bring FSD rules back to dependency-cruiser), or the app
outgrows one team (split by domain into packages).
