# 0018. Take the migration lock inside each migration's transaction

- Status: accepted
- Date: 2026-10-28

## Context and problem statement

[ADR 0013](0013-kysely-and-plain-sql-migrations.md) has the runner take a session
`pg_advisory_lock` on one pinned client connection, apply each pending file in its own
transaction, and then call `pg_advisory_unlock`. The lock, the bookkeeping table and the read of
applied ids run outside any transaction. That is safe only on a direct connection.

Behind a pooler in transaction mode, each statement outside a transaction may run on a different
server connection. This is the usual setup of managed and serverless Postgres, and the mode of
Neon's pooled endpoint (PgBouncer). The lock can stay on one server connection while the unlock
goes to another, and the next migrate then waits until that connection closes. Neon lists
session-level advisory locks as unsupported on pooled connections
([Neon: connection pooling](https://neon.com/docs/connect/connection-pooling)).

A product built from this template may choose another Postgres host. How does the runner stay
safe on any of them?

## Decision drivers

- Instances that boot at once never apply a migration twice (the reason for the lock).
- One `DATABASE_URL` works on a direct connection and behind any transaction pooler.
- A failing migration leaves the earlier ones applied, as in ADR 0013.
- The behaviour is testable on PGlite.

## Considered options

1. A transaction-level lock in each migration's transaction: `pg_advisory_xact_lock`, then read
   what is applied and apply the first pending file. One transaction per file, until none is
   pending.
2. Keep the session lock and give the migrate entry point a direct (unpooled) connection string,
   as Neon recommends for migrations.
3. One transaction for the whole run, with a transaction-level lock.

## Decision outcome

Chosen option 1. Nothing runs outside a transaction, so any pooler keeps each step on one server
connection. The lock ends with its transaction, so nothing has to be released and nothing can
leak.

Each transaction takes the lock, runs `create table if not exists schema_migration`, reads the
applied ids, and applies and records the first pending file. Two instances take turns per
migration: the second reads, under the lock, what the first committed. A test in
`migrations.db.test.ts` logs every statement through Kysely and fails if one is sent outside a
transaction.

Option 2 adds a second secret per environment. It also keeps a lock that breaks as soon as
`DATABASE_URL` points at a pooler. Option 3 rolls back every migration of the run when the last
one fails, which ADR 0013 rejected.

Errata in ADR 0013, which stays as written: the runner lives in `libs/database/migrations.ts`,
not `libs/database/migrate.ts`.

### Consequences

- Good: one `DATABASE_URL` works on a direct connection and behind any transaction pooler.
- Good: there is no unlock in a `finally`; a crash mid-migration releases the lock with the
  rollback.
- Bad: the lock, the `create table if not exists` and the read run once per migration instead of
  once per run.
- Bad: two instances may interleave migrations (one applies 0001, the other 0002). Each still
  runs once and in order.

## Revisit when

A migration must run outside a transaction (`create index concurrently` on a large table), or a
lock must be held across several migrations.
