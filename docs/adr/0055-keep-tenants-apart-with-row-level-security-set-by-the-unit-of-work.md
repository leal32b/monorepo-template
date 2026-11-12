# 0055. Keep tenants apart with row-level security, set by the unit of work

- Status: accepted
- Date: 2026-11-11

Amends [ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md) ("a product
query scoped to a tenant always filters on the `organizationId` that the guard returned") and
[ADR 0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md) ("which use
cases use it", and its "Room for tenant isolation").

## Context and problem statement

Tenant isolation was a convention. The guard of ADR 0033 proves the caller is a member of the
organization in the path; after it, each repository method takes `organizationId` and adds the
`where`. No migration defined row-level security, and nothing failed when a query forgot the filter.
A product built from this template is a set of modules copied from the reference one, many written
by an AI; one missing `where` in one of them shows another tenant's rows, and no test of that module
needs to notice.

What stands behind the `where`, so that forgetting it is harmless or loud, without making the
template harder to run, deploy or copy?

## Decision drivers

- A forgotten filter must not leak, including in SQL the query builder cannot see into (raw
  fragments, joins, subqueries) and in tables that do not exist yet.
- A new table joins the net with a few lines, and a check that runs in `pnpm test:coverage` fails
  when it does not.
- Holds on any Postgres and behind a pooler in transaction mode
  ([ADR 0018](0018-take-the-migration-lock-inside-each-transaction.md)).
- Nothing new for the owner to do by hand on the hosting side, if that can be avoided: no second
  role with a password, no second connection string.
- The same net in the tests (PGlite, one superuser), in the end-to-end suite and in production.
- Honest about the cost: reads ran on the pool as one statement, and a guarded request already makes
  two sequential round trips before its own query ([docs/operations.md](../operations.md)).

## Considered options

1. Row-level security, with the API connecting as a second login role that neither owns the tables
   nor bypasses row security; the organization set per transaction.
2. Row-level security, with the one existing connection: the unit of work switches to a role without
   login (`app_tenant`) and sets the organization, both for its transaction only.
3. A shared repository contract: every tenant repository passes a suite with a cross-organization
   case per method.
4. A check on the query's syntax tree (a Kysely plugin that refuses a statement on a tenant table
   without `organization_id = …`).
5. Options 2 and 3 together.

## Decision outcome

Chosen option: 2. The database enforces the tenant on every statement of a tenant transaction,
whatever the query says; the template keeps one `DATABASE_URL`, and the owner does nothing by hand.
The `where` on `organization_id` stays in every repository method (ADR 0033 stands): it is the first
line, the fakes need it, and it is what holds for code that runs outside a tenant transaction. Row
security is the net under it.

### How it works

- **The role.** Migration `0009_tenant_row_security.sql` creates `app_tenant` (`nologin`, no
  attributes) and grants it to the role that runs the migrations, which is the role the API connects
  as. `app_tenant` can use the `public` schema and only the tables granted to it; it has nothing on
  the `auth` schema.
- **The policy.** Each tenant table carries its organization in an `organization_id` column, and
  three lines:

  ```sql
  alter table customer enable row level security;
  create policy tenant_isolation on customer to app_tenant
    using (organization_id = current_setting('app.organization_id', true));
  grant select, insert, update, delete on customer to app_tenant;
  ```

  `using` also checks new rows (a policy without `with check` uses the same expression), so a row
  cannot be inserted into, or moved to, another organization. With no organization set the setting
  is null or empty, the comparison is not true, and no row is seen or written: it fails closed.
- **The unit of work.** `UnitOfWork.run` gains the organization: `run(organizationId, work)`.
  `KyselyUnitOfWork` sends one statement before `work`:

  ```sql
  select set_config('role', 'app_tenant', true), set_config('app.organization_id', $1, true)
  ```

  Both are local to the transaction (`is_local = true`, the function form of `set local`), so they
  end with it and cannot reach the next request through the pool or a pooler. After it, permission
  checks and row security apply as `app_tenant`.
- **Every tenant use case opens one**, reads included. This replaces ADR 0052's "a use case with a
  single write keeps taking the repository": the customers module's seven use cases all take
  `CustomersUnitOfWork`, `registerCustomerRoutes` takes no repository, and the composition root
  builds none on the pool. Outside `run` there is no tenant repository to call.
- **The owner still bypasses.** The tables are not `force row level security`, so migrations, the
  cascade that deletes an organization's rows, the purge job and a future back office or job worker
  run as before, as the owner, on the pool. Code that reads tenant tables there is outside the net
  and relies on its own `where`; it should be rare, reviewed, and never reachable from a tenant
  route.

### The checks

- **A table that forgot the lines** fails `tenant-row-security.db.test.ts`, which reads the catalog
  after the migrations: every table with an `organization_id` column, and every table `app_tenant`
  can touch, must have row security enabled and a policy for `app_tenant`. The test also creates a
  table without them and sees it reported.
- **A method that forgot the filter** is shown in `kysely-customer-repository.db.test.ts`: queries
  with no `where` at all, run inside `run('org-2', …)`, read, change and delete only `org-2`'s rows,
  and cannot insert a row of `org-1`.
- **A repository built on the pool** is refused by dependency-cruiser
  (`api-tenant-adapters-through-the-unit-of-work`): the composition root may import, from a module's
  `database/`, only its unit of work (the health probe is the exception).
- The contract suites still run against the Kysely adapters on the bare connection, as the owner,
  where row security is out of the way: there the cross-organization cases test the `where` itself.

### The open question: does a pooler in transaction mode keep a `set local`?

Yes, by what transaction mode is, and on any provider:

- PgBouncer: in transaction pooling "a server connection is assigned to a client only during a
  transaction". Every statement between `begin` and `commit` therefore reaches the same session, and
  anything Postgres scopes to the transaction lives and dies inside it. What its feature table lists
  as never supported in this mode is session state: `SET/RESET`, `LISTEN`, session-level advisory
  locks, SQL `PREPARE`, `WITH HOLD` cursors. It has no row for `SET LOCAL`, because nothing of it
  outlives the transaction.
- Postgres: for `set_config`, "if `is_local` is true, the new value will only apply during the
  current transaction"; `set role` takes the same `local` modifier.
- The default host: Neon's pooled endpoint is "PgBouncer in transaction mode
  (`pool_mode=transaction`)", not configurable, and its unsupported list is the same session state.
  Its example of a `set` that is lost is one sent outside a transaction. Render's and Supabase's
  poolers say the same ("session-level state is lost between transactions… run them inside the
  transaction that needs them").
- No provider's page names `set local` or `set_config(…, true)` as supported in so many words. The
  evidence beyond the definition is this repository's own: its migrations have run through the
  pooled endpoint since ADR 0018 with `set local statement_timeout = 0` and
  `pg_advisory_xact_lock` in each transaction (ADR 0047), which depend on exactly this.
- What would break it: a pooler in **statement** mode (it refuses multi-statement transactions, so
  the unit of work of ADR 0052 already fails there), or sending the `set_config` outside a
  transaction (the unit of work cannot).

### Why the role is switched, and not a second login role (option 1)

Row security does not apply to superusers, to roles with `BYPASSRLS`, or (without `force`) to the
table's owner. The API connects as the owner, and on the default host that role also bypasses row
security: roles made in Neon's console or API are members of `neon_superuser`, which carries
`BYPASSRLS` on projects created after August 2023, so `force row level security` would change
nothing there. `force` would also make a later migration's backfill silently touch no rows on hosts
where the owner does not bypass.

Option 1 is the stricter answer: every statement of the API, on any path, under row security. It
costs a second role created by hand with a password, a second connection string (migrations as the
owner, the API as the other), grants on the whole `auth` schema, the session limits of
`0005_session_timeouts` set again for that role, a deploy that carries both strings, and test and
end-to-end databases (PGlite: one superuser, one session) that cannot connect as a second role at
all. Option 2 gets the same enforcement for everything inside a tenant transaction with none of
that, because `set role` changes whose attributes and privileges are checked. What it gives up:
code on the pool is not confined. The dependency rule and the shape of the module (no repository
outside `run`) cover that path; they are conventions, checked.

A product that wants option 1 later keeps everything here: it creates the login role, grants it
`app_tenant` and the `auth` tables, and points the API's `DATABASE_URL` at it. The policies, the
unit of work and the tests do not change.

### What it costs

- **Three more round trips per tenant request**: `begin`, the `set_config` statement and `commit`
  around what used to be one statement on the pool. A read is now four statements (the list, whose
  page and count ran in parallel on two connections, is five, in sequence on one). With the API and
  the database in one region a round trip is around a millisecond or two, so a request that made
  about three now makes about six; across regions each one costs what `docs/operations.md` already
  warns about, twice over.
- **A connection is held longer**: from `begin` to `commit`, not for one statement. The pool has
  five (ADR 0047); the rules of ADR 0052 (nothing but database work inside `run`, never a second
  connection) now apply to every tenant use case.
- **Why it is still worth it**: the cost is a few milliseconds a request, paid by a template whose
  products start small; the failure it removes is one tenant reading another's data, found by a
  customer. P2-4 of the product readiness plan (one round trip for the tenant guard) takes back two
  of the round trips on the other side of the request.

### One connection over PGlite

Local development and the end-to-end suite run on PGlite behind its socket server (`pglite-server`),
which is one Postgres session shared by every connection. It queues protocol messages one by one,
and gives a transaction's connection the turn until it commits. When two other connections wait
behind that transaction, their `Parse` and `Bind` messages are then taken in arrival order, not per
connection: the second `Parse` replaces the first's unnamed statement, and the first connection
either fails with `08P01` ("bind message supplies 1 parameters, but prepared statement requires 2")
or, with the same number of parameters, receives the other query's rows. Seen with
`@electric-sql/pglite-socket` 0.2.14, and reproduced with three connections in a script.

It was there before this record, but a transaction was rare (deleting a customer). With one per
tenant request, the end-to-end suite failed about two runs in three, on screens that have nothing to
do with customers (the organization list answered 500). It cannot happen on a Postgres server, where
each connection is its own session.

So over PGlite the API's pool has one connection, which sends one statement or one transaction at a
time: `main.e2e.ts` builds its pool with `maxConnections: 1`, and `pnpm dev` runs with
`DATABASE_POOL_SIZE=1` (a new, optional variable; unset, the pool keeps the five of ADR 0047, and
the deploy does not set it). PGlite ran one statement at a time already, so nothing is slower. With
one connection, code inside `run` that asks the pool for a second one waits ten seconds and fails,
which is the rule of ADR 0052 made loud. The database tests (`*.db.test.ts`) keep the pool of five:
each file awaits its statements in turn.

### Why not the others

- **Option 3, a shared contract with a cross-organization case per method.** It runs only the
  methods someone listed, with the arguments someone thought of; the author who forgets the filter
  is the one who writes the case. The reference suites keep their cross-organization cases, as
  documentation of each method and as the test of the `where`, but no shared harness was added:
  under row security a missing case no longer leaks.
- **Option 4, checking the syntax tree.** No extra round trip, but it sees only what Kysely builds:
  a raw `sql` fragment is opaque, a filter inside an `or` passes, and every join or subquery is a
  new rule to write. It would be a second implementation of what Postgres already does exactly.
- **Option 5, both.** The contract would add a per-module chore under a net that already holds.

### How a new table joins

1. The table has `organization_id text not null references auth."organization" ("id") on delete cascade`.
   A child table (the items of a sale) carries the column too: a policy on the parent does not cover it.
2. Its migration ends with the three lines above.
3. Its adapter is built only in the module's unit of work (`bind`), and its use cases call
   `run(organizationId, …)` with the id the guard returned.
4. `pnpm test:coverage` says so if step 2 is missing; `pnpm lint:deps` if step 3 is.

A table of the platform that tenants never touch (no `organization_id`, no grant) needs nothing. A
table tenant transactions write but must not read (a job queue) gets `enable row level security`,
an insert-only policy and `grant insert`.

Sources: [Postgres row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html),
[`set_config`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET),
[`SET ROLE`](https://www.postgresql.org/docs/current/sql-set-role.html),
[PgBouncer's pooling modes and what each supports](https://www.pgbouncer.org/features.html),
[Neon connection pooling](https://neon.com/docs/connect/connection-pooling),
[Neon roles and `neon_superuser`](https://neon.com/docs/manage/roles),
[Render connection pooling](https://render.com/docs/postgresql-connection-pooling),
[Supabase: connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).
Read on 2026-11-11.

### Consequences

- Good: a query without the filter, in any tenant transaction, cannot read or write another
  organization's rows; a tenant transaction cannot touch the `auth` schema at all.
- Good: one connection string, no manual step on any host, the same behaviour on PGlite, in the
  end-to-end suite and in production.
- Good: a new table that forgets its policy fails a test; a repository built on the pool fails the
  dependency check.
- Bad: three more round trips and a longer hold on a connection for every tenant request.
- Bad: code that runs on the pool as the owner is outside the net; a product whose threat model
  includes its own back-office code, or SQL injection, wants option 1 on top.
- Bad: `app_tenant` is a name in the cluster, not in the database. Two products sharing one cluster
  under different owners collide on it; rename it in the migration and in `kysely-unit-of-work.ts`.
- Bad: the in-memory unit of work ignores the organization. A use case that passes one organization
  to `run` and another to a repository is refused by Postgres and accepted by the fake; the
  repository's own filter is what the fake checks.
- Bad: on PGlite every transaction waits for the one before it (one session), and the API's pool is
  one connection there, so the tests and the end-to-end suite show the rules, not the concurrency.
- Bad: a database test that sent statements from three connections at once, one of them inside a
  transaction, would meet the socket server's defect; none does today.

## Revisit when

Tenant requests show the extra round trips in their latency, or pool waits appear under normal load
(then: a database in the API's region first, P2-4 second, a larger pool third); a product adds code
that reads tenant tables outside a unit of work as a matter of course (a back office, reports),
which is the signal for a second login role; `pglite-socket` keeps a connection's messages together
(then drop `maxConnections: 1` and `DATABASE_POOL_SIZE=1`); or a host's pooler is found to drop transaction-local
settings, which would end this design and ADR 0018 with it.
