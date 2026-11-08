# 0047. Put time limits on every database wait

- Status: accepted
- Date: 2026-11-08

## Context and problem statement

The API's `pg` pool had no limits: no deadline to open a connection or to wait for a free one, and
none on a statement. With the database out of reach, or one query stuck on a lock, a request waited
until Node's request timeout (300 s). Five connections are taken by a few such requests and the whole
API stalls, while `GET /api/health/live` keeps answering 200, so the host never restarts it. The web
gives writes no limit ([ADR 0041](0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)), so the
user waits for ever.

A limit set only in the client frees the request but not the connection: `pg`'s `query_timeout`
returns an error and puts the client back in the pool while the database still runs the statement.
A limit set per connection (`SET`, or `options=-c` in the connection string) does not survive a pooler
in transaction mode, which hands each transaction to any server connection and may refuse such startup
parameters. PGlite, the test database, does not enforce `statement_timeout` at all.

Which limits does the API put on the database, where are they set so that they hold behind any pooler,
and how is a stalled database noticed?

## Decision drivers

- Every wait ends, quickly enough for a person, slowly enough for a database waking from suspension
  (Neon in the template; the health probe allows 3 s, the deploy's smoke test about 25 s).
- The database stops the work too, so the connection is free again, not only the request.
- Works on any Postgres, behind a pooler in transaction mode or none ([ADR 0018](0018-take-the-migration-lock-inside-each-transaction.md)).
- The user sees "try again", support sees a reason, and the log has no stack for what is not a bug.
- Testable on PGlite where it can be.

## Considered options

1. Limits in the pool (connect and wait) and a client deadline per statement, plus the database's own
   `statement_timeout` and `idle_in_transaction_session_timeout` set on the API's role in its database
   by a migration.
2. Client limits only (`connectionTimeoutMillis`, `query_timeout`).
3. `statement_timeout` sent per connection (the driver's startup parameter or a `SET` on connect).
4. Make `/api/health/live` query the database, so the host restarts a stalled API.

## Decision outcome

Chosen option: 1, because each layer covers what the other cannot: the database cancels a statement
and frees its connection, the client gives up when the database cannot even answer, and both hold
behind a pooler.

- **Pool** (`#libs/database/database`): `connectionTimeoutMillis` of 10 s bounds both opening a
  connection and waiting for a free one; `query_timeout` of 15 s is the client's deadline per
  statement. The migration process passes `queryTimeoutMs: 0`: a migration may rewrite a large table.
- **Database** (migration `0005_session_timeouts.sql`): `alter role current_user in database … set`
  `statement_timeout = 10s` and `idle_in_transaction_session_timeout = 30s`. Every new session of that
  role in that database starts with them, whatever pooler sits in between. The database's limit comes
  before the client's, so the usual failure is the database's own, clean one. `runMigrations` lifts the
  statement limit with `set local` inside each migration's transaction only.
- **Answer:** `isDatabaseUnavailable` recognises a limit reached (the pool's and the client's messages,
  Postgres codes 57014 and 25P03), a server going away or full (57P01 to 57P03, 53300, class 08) and a
  network failure (`ECONNREFUSED`, `ENOTFOUND`, …). The HTTP pipeline takes it as `isUnavailable` and
  answers `503 service_unavailable` with `Retry-After: 5`, logs one warning `dependency unavailable`
  with the reason and no stack, and the access log's `request failed` line follows. The web already
  shows any 5xx as "Something went wrong on our side. Try again in a moment." with the reference, so
  it needs no change.
- **Liveness:** `/api/health/live` stays free of I/O ([ADR 0014](0014-hosting-and-deploy-from-github-actions.md)).
  With the limits, the pool cannot stall for good: every wait ends within about 25 s and the next
  request gets a connection again. A restart would not bring an unreachable database back, and it
  would drop the requests that still work. A stalled database is noticed instead by `/api/health`
  answering 503 to the uptime monitor, and by `dependency unavailable` lines in the API log
  ([docs/operations.md](../operations.md)).

### Consequences

- Good: a database out of reach costs a user at most about 25 s and a clear "try again", never a hung
  screen; the API serves again as soon as the database does.
- Good: a stuck statement or a forgotten open transaction no longer holds a connection for ever.
- Good: the limits live in two constants and one migration; a product changes them with a new migration.
- Bad: the role's limits also apply to anyone who connects as that role, such as a person in `psql`
  running a long report; they lift it for their session with `set statement_timeout = 0`.
- Bad: PGlite does not enforce the database's limits, so tests prove the role's settings and the
  client's deadline, not the server's cancellation. The migration process and the API must share the
  role (they do in the template: one `DATABASE_URL`), or the settings land on the wrong role.
- Bad: Better Auth's routes run their own error handling; a database timeout there may still answer
  as Better Auth decides, not as this 503.

## Revisit when

A legitimate request needs more than 10 s of database work (move it to a background job rather than
raise the limit), the product splits the migration role from the runtime role, or the host offers a
readiness check that can take an instance out of rotation without restarting it.
