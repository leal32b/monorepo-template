# 0012. Bundle the API with esbuild for production

- Status: accepted
- Date: 2026-10-24

## Context and problem statement

In development the API runs its TypeScript through `tsx`, and `@repo/contracts` exports its
source (`src/index.ts`). A container needs something `node` can run on its own. [ADR 0005](0005-contracts-as-zod-schemas.md)
and [ADR 0006](0006-api-architecture.md) left open how TypeScript and workspace packages reach
`node` in production; this record answers it.

## Decision drivers

- One artifact to ship; the runtime image holds no `node_modules` and no source.
- Workspace packages are not built separately; `@repo/contracts` keeps exporting its source.
- Code is written as it is today (parameter properties, extensionless relative imports).
- Production stack traces point at the TypeScript lines.
- Development (`tsx watch`) and type checking (`tsc`) do not change.

## Considered options

1. Bundle each entry point with esbuild (dependencies included).
2. Emit JavaScript per package with `tsc`, select source or `dist` with a custom export
   condition, and ship `pnpm deploy --prod` output.
3. Run the source with Node's type stripping, no build.

## Decision outcome

Chosen option 1.

- `pnpm --filter @repo/api build` runs a short esbuild script: entries `src/main.ts` and
  `src/migrate.ts`, `bundle`, `platform: node`, `format: esm`, `target: node26`, `sourcemap`,
  output in `apps/api/dist/`.
- CommonJS dependencies get a real `require` through a banner using `createRequire`; optional
  native add-ons (`pg-native`) are `external`.
- The container runs `node --enable-source-maps dist/main.js`; the image copies only `dist/`
  and the SQL migrations.
- `@repo/contracts` keeps `exports` pointing at `src/index.ts`: Vite bundles it for the web,
  esbuild for the API, so the package never needs a build.

Option 2 adds a build and a `tsconfig.build.json` per package plus a custom condition to keep
in sync. Option 3 requires `erasableSyntaxOnly` (rewriting every parameter property), explicit
`.ts` extensions in every relative import, and relies on pnpm links resolving outside
`node_modules`.

### Consequences

- Good: a single file per entry point, a small image, no package builds, code style unchanged.
- Good: tree-shaking drops what the API does not use.
- Bad: esbuild does not type-check; `pnpm typecheck` in CI is what guards types.
- Bad: CommonJS interop needs the `createRequire` banner; worker-based code (pino transports)
  cannot be bundled, so production logs plain JSON to stdout.
- Bad: one more dev dependency.

## Revisit when

A dependency cannot be bundled (native add-on, worker files), or Node runs the source as it is
written and a build step stops paying for itself.
