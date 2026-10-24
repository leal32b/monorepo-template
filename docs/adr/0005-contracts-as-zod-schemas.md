# 0005. Contracts as Zod schemas in a shared package

- Status: accepted
- Date: 2026-10-16

## Context and problem statement

The API and the web app must agree on the shape of every request and response. Types alone
disappear at runtime: a body cast to a type is not validated, and the two sides can drift
unnoticed. Where is the shape defined, and who checks it?

## Decision drivers

- One definition, used by both sides; no hand-synchronised copies.
- Runtime validation at the edges, not only compile-time types.
- No code generation step.
- A client importing only constants should not bundle the validator.

## Considered options

1. Plain TypeScript types shared between apps.
2. OpenAPI document + generated clients and types.
3. Zod schemas in `@repo/contracts`, types inferred with `z.infer`.

## Decision outcome

Chosen option 3. Every request and response is a Zod schema exported by `@repo/contracts`;
its type is `z.infer` of the schema, so schema and type cannot diverge. The API validates
requests at the edge and tests validate responses against the same schemas; the web validates
what it receives. Zod 4 implements Standard Schema, which keeps the door open to other consumers.

Conventions:

- One file per area (`health.ts`), exported only through `src/index.ts`.
- Internal packages use the neutral scope `@repo/*` (`@repo/api`, `@repo/contracts`...): it says
  "internal to this repository, never published" and never needs renaming in a SaaS derived
  from the template.
- The package declares `sideEffects: false` so bundlers can tree-shake it.
- For now `exports` points at `src/index.ts`; how it is built for production is decided with the
  API build (Phase 2 / 4).

### Consequences

- Good: a contract change is a compile error on both sides and a failing test.
- Good: no generators or extra tooling.
- Bad: no machine-readable API document for third parties (can be derived later).
- Bad: validating on the web costs bytes and CPU; acceptable for JSON payloads of this size.

## Revisit when

A public API needs an OpenAPI document, or Zod's bundle cost matters for the web.
