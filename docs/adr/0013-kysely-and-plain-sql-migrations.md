# 0013. Access Postgres with Kysely and migrate with plain SQL files

- Status: accepted; the migration lock is superseded by [0018](0018-take-the-migration-lock-inside-each-transaction.md)
- Date: 2026-10-24

## Context and problem statement

[ADR 0003](0003-postgres-as-the-database.md) chose Postgres and left the access library and the
migration tool to this phase. Repositories sit behind ports ([ADR 0006](0006-api-architecture.md));
their adapters need a way to write queries, the schema needs a way to evolve, and adapter tests
need a real Postgres without making every contributor run one.

## Decision drivers

- Queries checked by the compiler, without code generation or an ORM runtime model.
- The SQL that runs is the SQL a reviewer reads.
- Migrations that are readable, ordered, safe with more than one instance, and need no bundling.
- Adapter tests run against real Postgres semantics, locally and in CI, without Docker.
- Few dependencies; nothing tied to one host.

## Considered options

Access:

1. Kysely (type-safe query builder) over `pg` (node-postgres).
2. `pg` or `postgres.js` with hand-written SQL only.
3. Drizzle ORM with drizzle-kit.
4. Prisma.

Migrations:

1. Plain `.sql` files and a small runner owned by the repository.
2. Kysely's `Migrator` with TypeScript migrations.
3. node-pg-migrate or dbmate.

Test database:

1. PGlite (Postgres compiled to WebAssembly) served over TCP by `@electric-sql/pglite-socket`.
2. A Postgres container (Docker Compose locally, a service container in CI).
3. pg-mem (an in-memory emulation of Postgres).

## Decision outcome

Chosen: **Kysely over `pg`**, **plain SQL migrations with an own runner**, **PGlite in tests**.

- **Access.** One `pg` `Pool` (small `max`, Neon's pooled endpoint, `sslmode=require`) wrapped in
  a `Kysely` instance, created in `libs/database/` and closed by the graceful shutdown. Table
  types are written by hand next to the adapters that use them; Kysely types never leave
  `database/` adapters, so use cases and the domain see only ports.
- **Migrations.** `apps/api/migrations/NNNN_snake_case.sql`, forward only; an applied file is
  never edited. `libs/database/migrate.ts` takes a session `pg_advisory_lock`, applies each
  pending file in its own transaction and records it in `schema_migration`. A separate entry
  point (`src/migrate.ts`) runs before the server starts ([ADR 0014](0014-hosting-and-deploy-from-github-actions.md)).
- **Tests.** A Vitest `globalSetup` starts PGlite behind `pglite-socket` and runs the migrations;
  adapters connect through the same `pg` `Pool` and Kysely code as production. Database tests
  live in their own Vitest project and run serially. The Neon project uses the same Postgres
  major as PGlite.

Drizzle ties table definitions to its schema DSL and generates migrations by diff; Prisma adds
code generation and a query engine. Kysely's `Migrator` needs TypeScript migrations loaded at
runtime, which fights the bundle ([ADR 0012](0012-bundle-the-api-with-esbuild.md)). A Postgres
container works but makes Docker a prerequisite of `pnpm test`. pg-mem parses SQL with its own
parser and emulates only part of Postgres (no time zones, numbers as JavaScript numbers, no
extensions), so a test can pass there and fail on Neon.

### Consequences

- Good: compile-time checked queries with no generated code; SQL migrations anyone can read.
- Good: `pnpm test` needs only Node; the adapter code path is the production one.
- Bad: table types are maintained by hand alongside the migrations.
- Bad: the runner is code we own and test; there are no down migrations.
- Bad: PGlite is a single backend session (connections are multiplexed) without SSL: advisory
  lock contention between two instances cannot be shown in tests, only that the lock is taken
  and released.

## Revisit when

A bug passes against PGlite and fails on Neon; table types drift from migrations often enough to
want `kysely-codegen`; or the team needs down migrations or schema diffing.
