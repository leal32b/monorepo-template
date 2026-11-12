# 0052. Run a use case's writes in one transaction through a unit of work

- Status: accepted; `run` takes the organization and every tenant use case opens one since [0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md); its `customer_change` table replaced by the audit trail of [0061](0061-keep-one-append-only-audit-trail-per-organization.md)
- Date: 2026-11-11

## Context and problem statement

Nothing under `apps/api/src` opened a transaction outside the migration runner, and the reference
module ([ADR 0044](0044-build-customers-as-the-reference-vertical-module.md)) showed one repository
call per write. A product's first use case that writes two tables (an appointment and its charge, a
sale and its items, a change and the job it enqueues) had no pattern to copy, and the obvious
shortcut, a Kysely transaction opened in the service, breaks [ADR 0006](0006-api-architecture.md) and
[ADR 0013](0013-kysely-and-plain-sql-migrations.md): use cases see ports, never Kysely.

How does a use case make several repository calls commit or roll back together, in the Kysely
adapters and in the in-memory fakes alike, within the time limits of
[ADR 0047](0047-put-time-limits-on-every-database-wait.md) and behind a pooler in transaction mode?

## Decision drivers

- The domain and the services do not know Kysely, `pg` or the word `begin`.
- The fake that use-case tests lean on rolls back too, under the same contract suite as the adapter,
  so a service test can show "the second write failed, the first is gone".
- A call outside the transaction is visible in the code and hard to write by accident.
- Holds on any Postgres, behind a pooler in transaction mode, with a pool of five connections.
- Room for what comes next without a second mechanism: tenant isolation set per transaction (P0-2 of
  the product readiness plan), a job enqueued with the change that causes it (P0-4), an audit entry
  (P1-1).
- One small thing to copy: no container, no base class (ADR 0006).

## Considered options

1. A unit-of-work port: `run(work)` opens a transaction and calls `work` with repositories bound to
   it; it commits when `work` resolves and rolls back when it throws.
2. An ambient transaction in `AsyncLocalStorage`: repositories look up "the current transaction" and
   fall back to the pool.
3. A transaction handle passed as an extra argument of each repository method.
4. One repository method per combination, with the transaction inside the adapter
   (`removeAndRecord(customer, change)`).
5. One transaction per HTTP request, opened by the pipeline.

## Decision outcome

Chosen option: 1, because the transaction's reach is a block of code a reviewer can see, the only
repositories in scope inside it are the ones bound to it, and the fake can keep the same promise.

- **Port** (`#libs/ports/unit-of-work.port`): `UnitOfWork<Repositories>` with one method,
  `run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>`. A module names its own:
  `CustomersUnitOfWork = UnitOfWork<{ customers: CustomerRepository; changes: CustomerChangeLog }>`
  (`customers-unit-of-work.port.ts`). A use case that spans modules gets a unit of work whose
  repositories come from each module's `index.ts`, built in the composition root.
- **Adapter** (`#libs/database/kysely-unit-of-work`): `KyselyUnitOfWork(db, bind)` runs
  `db.transaction().execute((trx) => work(bind(trx)))`. `bind` builds the same adapter classes on the
  transaction that the composition root builds on the pool (a Kysely `Transaction` is a `Kysely`), so
  a repository is written once and does not know which one it holds. Adapters never call
  `.transaction()` themselves: only the unit of work opens one, so transactions never nest.
- **Fake** (`#libs/adapters/in-memory-unit-of-work`): every in-memory repository implements
  `snapshot()`, which returns a function that puts its state back. `InMemoryUnitOfWork` takes the
  snapshots before `work` and restores them when it throws.
- **Contract:** `testing/customers-unit-of-work.contract.ts` runs against both: both writes are kept
  when the work ends, and neither when the second write fails or the work throws.
- **Which use cases use it:** one that writes more than once, or whose write depends on a read that
  must not move under it and has no version check to catch that. A use case with a single write keeps
  taking the repository: one statement is already atomic, and a transaction around it costs two more
  round trips and holds a connection longer. Queries never use it.
- **Isolation** stays Postgres's default, read committed. A lost update is still refused by the
  version in the `where` ([ADR 0048](0048-refuse-a-stale-save-with-a-version-per-record.md)), inside
  a transaction as outside one.

### Rules inside `run`

- Use only the repositories the callback receives. A repository built on the pool, called inside the
  callback, takes a second connection and is not part of the transaction.
- Nothing but database work: no email, no HTTP call, no waiting on anything else. What must happen
  after the commit is done after `run` returns (or, with P0-4, enqueued inside it as a row).
- A statement that fails ends the transaction: Postgres refuses every later statement (`25P02`)
  until the rollback. Let the error leave the callback; do not catch it and carry on. A repository
  may still query after a statement that succeeded and matched no row, as `save` does to tell "gone"
  from "changed".
- Draw ids and read the clock before or inside the callback as values; the domain stays pure.

### The time limits of ADR 0047 inside a transaction

- **`statement_timeout` (10 s)** applies to each statement, not to the transaction. A cancelled
  statement (`57014`) ends the transaction as any failed statement does; the unit of work rolls back
  and the pipeline answers the usual 503.
- **`idle_in_transaction_session_timeout` (30 s)** is the limit on the gaps between statements: a
  callback that awaits something slow while the transaction is open has its session ended by the
  database (`25P03`, already a 503), and its work rolled back. This is the net under the second rule
  above, and the reason locks taken by a transaction cannot be held for ever.
- **The client's deadline (15 s per statement)** still ends a wait the database cannot. The
  `rollback` the unit of work then sends goes down the same connection and is bounded by the same
  deadline; if it fails too, the original error is the one reported, and the database rolls the
  session back when it ends.
- **The pool of five.** A transaction holds one connection from `begin` to `commit`, where a single
  statement holds one for a round trip. Five requests inside `run` at once are the whole pool; the
  sixth waits up to 10 s for a connection and then answers 503. So transactions stay short (a few
  statements, no I/O between them), and a callback never asks the pool for a second connection: five
  transactions each waiting for a sixth connection would all time out together.
- There is no limit on a transaction's total time beyond those. Postgres 17 has `transaction_timeout`;
  a product on 17 or later may add it to the role by a migration, as `0005_session_timeouts` did.

### Behind a pooler in transaction mode

A pooler in transaction mode gives a client one server connection from `begin` until `commit` or
`rollback`, so everything inside `run` reaches the same session, in order: several statements, row
locks, `set local`, `set_config(…, true)` and `pg_advisory_xact_lock` all hold until the transaction
ends, and are gone when the connection goes back. The repository already relies on this for
migrations ([ADR 0018](0018-take-the-migration-lock-inside-each-transaction.md), and the `set local`
of ADR 0047). What does not survive is state kept across transactions: `set` without `local`,
session advisory locks, `listen`, temporary tables. Nothing in the unit of work uses any of it.

### Room for tenant isolation (P0-2)

Not built here. If P0-2 chooses row-level security, the unit of work is where the tenant is set:
`run` gains the organization as its first argument, and `KyselyUnitOfWork` sends
`select set_config('app.organization_id', $1, true)` as the transaction's first statement, which the
policies read with `current_setting`. The setting is local to the transaction, so it cannot leak to
the next request through the pool or a pooler. Every tenant query, reads included, then runs inside
a unit of work, because a statement outside one would have no organization set and see no rows; the
"single write keeps the repository" rule above would give way to "every tenant use case opens one",
at the cost of two round trips per request. The change is a new parameter, so the compiler lists
every call site. The provider check P0-2 asks for (that the default host's pooled endpoint keeps a
`set_config(…, true)` inside a transaction) is left to that item.

### The reference use case: deleting a customer leaves a record

The plan's open question was which second write the reference module can show without a product
rule. Chosen: **`DeleteCustomerService` removes the customer and appends one row to
`customer_change`** (migration `0007_customer_change.sql`): the organization, the customer's id, the
action (`deleted`), the member who did it and when.

- Deletion is the one change that leaves nothing behind. Creating, editing, archiving and restoring
  are all still readable on the row (`created_at`, `updated_at`, `archived_at`, `version`); after a
  delete, nobody can answer "who deleted this, and when". So the record is useful on its own, and
  the two writes must agree: a record of a deletion that did not happen, or a deletion without its
  record, are both wrong.
- It is platform, not product: no screen, no text, no permission, no new field in the contract.
- It holds ids only, never the customer's name or email, so deleting still removes the personal
  data. `actor_id` has no foreign key: the record outlives an account deleted later
  ([ADR 0049](0049-delete-an-account-from-an-emailed-link.md)). The row goes with its organization.
- The other four writes are left on the single repository on purpose, to show both shapes side by
  side. P1-1 (audit trail) decides whether this table grows into the organization's audit log
  (every write, a small diff, a screen, retention) or is replaced by it.
- Rejected: writing a change row from every command (a heavier mould before P1-1 has decided its
  shape); a second table invented for the purpose, such as customer contacts or tags (a product
  rule); enqueueing a job (P0-4 does not exist yet).

### How to copy the module, with a second write

This adds to "How to copy the module" of ADR 0044:

- A use case with one write copies `ArchiveCustomerService`: it takes the repository.
- A use case with two copies `DeleteCustomerService`: it takes the module's unit of work, and reads,
  decides and writes inside `run`, with the repositories `run` hands it.
- The module's pieces for it: `customers-unit-of-work.port.ts` (the names of the repositories a
  transaction offers), `database/kysely-customers-unit-of-work.ts` (the adapters bound to a
  transaction), `snapshot()` on each in-memory fake, `testing/customers-unit-of-work.contract.ts`
  (run by the fake's test and the adapter's), and one more port in `registerCustomerRoutes`.
- A new repository joins the transaction by being added to the port's type and to the two places
  that build it (`bind` in `database/`, `testCustomers` in `testing/`).

Sources: [Kysely transactions](https://kysely.dev/docs/examples/transactions/simple-transaction),
[Postgres `statement_timeout`, `idle_in_transaction_session_timeout` and `transaction_timeout`](https://www.postgresql.org/docs/current/runtime-config-client.html),
[`set_config`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET),
[PgBouncer's pooling modes and what each supports](https://www.pgbouncer.org/features.html).

### Consequences

- Good: a two-write use case has a worked, tested example in the service, the fake and the adapter;
  a service test shows a rollback without a database.
- Good: the transaction's reach is one callback; repositories are written once and work on the pool
  or in a transaction.
- Good: one place to set the tenant per transaction, and one place a job or an audit entry joins
  the change that causes it.
- Bad: one more port, one more file in `database/` and a `snapshot()` per fake in every module that
  needs a transaction.
- Bad: the rules inside `run` are conventions. A pool-bound repository captured from outside the
  callback compiles; only the 30 s idle limit and review stand behind "no other I/O".
- Bad: the fake is not Postgres. It does not isolate two units of work running at once, and it lets
  a callback carry on after a failed write, where Postgres refuses. PGlite is one session shared by
  every connection, so tests cannot show isolation between transactions or pool exhaustion either;
  they show commit and rollback.
- Bad: the reference module carries a `customer_change` table nothing reads yet, until P1-1.

## Revisit when

A use case needs to keep part of its work after a failure (savepoints), or to retry on a
serialization failure (a stricter isolation level); transactions show up in the log as pool waits
(`timeout exceeded when trying to connect`) under normal load; or P0-2 puts every tenant query in a
transaction, which would make the unit of work the default shape of a use case, not the exception.
