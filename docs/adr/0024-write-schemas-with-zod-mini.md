# 0024. Write schemas with Zod Mini

- Status: accepted
- Date: 2026-10-31

## Context and problem statement

[ADR 0005](0005-contracts-as-zod-schemas.md) put every contract in a Zod schema and left the
cost of Zod on the web as a point to revisit. Zod 4 ships two APIs from the same package: `zod`,
whose schemas carry their methods (`z.string().min(1).optional()`), and `zod/mini`, whose schemas
are plain objects and whose rules are functions (`z.optional(z.string().check(z.minLength(1)))`).
Which one do the contracts, the API and the web write?

## Decision drivers

- The web bundles the schemas it validates with; unused methods are dead weight there.
- One API in the whole repository, so a schema reads the same everywhere.
- No change to what the schemas accept or reject.
- Standard Schema support stays, as [ADR 0005](0005-contracts-as-zod-schemas.md) wants.

## Considered options

1. `zod`, the method-chaining API.
2. `zod/mini`, the functional API, everywhere.
3. `zod` in the API and `zod/mini` in the contracts and the web.

## Decision outcome

Chosen option 2. Every schema is written with `import * as z from 'zod/mini'`; rules go through
`.check(...)` and combinators are functions (`z.optional`, `z.pipe`, `z.transform`, `z._default`).
Types are still inferred (`z.infer`, `z.output`) and generic parameters use `z.ZodMiniType`.
Both APIs parse the same way, so a schema from `@repo/contracts` is accepted wherever the API
or the web validates. The `zod` package and its catalog entry stay as they are: `zod/mini` is
part of it.

Option 3 was rejected because a contract would then be written in a style that differs from the
code that uses it, and the API gains nothing from the larger API.

### Consequences

- Good: bundlers can drop the rules a schema does not use.
- Good: one style across contracts, API and web.
- Bad: schemas are more verbose (`z.string().check(z.minLength(1))`), and most Zod examples and
  answers online use the method API, so they need translating.
- Bad: `z.preprocess` and a few other conveniences are replaced by `z.pipe` and `z.transform`,
  as the environment loader of the API shows.

## Revisit when

The bundle budget of Phase 8 shows the difference is not worth the verbosity, or the method API
becomes the only one with a feature we need.
