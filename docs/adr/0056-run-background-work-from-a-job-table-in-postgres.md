# 0056. Run background work from a job table in Postgres

- Status: accepted
- Date: 2026-11-11

## Context and problem statement

The only work that runs away from a request is the daily purge
([ADR 0050](0050-purge-expired-rows-daily-from-a-job-of-its-own.md)). Everything else happens inside
the request or is lost: identity's emails are sent without waiting and a failure is only logged
([ADR 0021](0021-send-email-through-a-provider-neutral-port.md)), so nothing is retried. A product
needs a reminder sent at a time, a payment webhook processed after its 200, an export built in the
background, and a retry when a provider fails.

[ADR 0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md) left room for "a
job enqueued with the change that causes it". [ADR 0047](0047-put-time-limits-on-every-database-wait.md)
limits every statement to 10 s and every idle transaction to 30 s, and the database may sit behind a
pooler in transaction mode. The default hosts are free tiers: the API's container sleeps when no
request arrives, and the database suspends when no query does, with a monthly compute budget.

Where do jobs live, what is a job, who runs it and where, and what does the template promise about
it?

## Decision drivers

- A job is enqueued in the same transaction as the change that causes it, or not at all.
- Any Postgres, behind a pooler in transaction mode, with the limits of ADR 0047, and on PGlite in
  tests ([ADR 0013](0013-kysely-and-plain-sql-migrations.md)).
- The schema is a plain SQL migration the repository owns; the runtime role needs no right to
  create tables (the plan's P0-2 may make it a non-owner).
- Few dependencies; no new service, no new secret, nothing a free tier lacks.
- An idle queue costs no database compute: a poll every few seconds would keep a suspending
  database awake for as long as the API is.
- A failure is retried, and one that keeps failing ends in a state someone can see.
- Handlers and use cases are tested without a database and without waiting.

## Considered options

Where jobs live:

1. A `job` table of our own, claimed with `for update skip locked`, with a small worker we own.
2. [pg-boss](https://github.com/timgit/pg-boss), a queue library on the same idea.
3. [Graphile Worker](https://worker.graphile.org/), another one.
4. A queue outside Postgres (Redis with BullMQ, a cloud queue, the host's queue).

Where the worker runs:

A. Inside the API process.
B. A process of its own, from the same image.
C. Both, chosen by a setting.

## Decision outcome

Chosen option: 1, with C. A table and about three hundred lines we own fit every driver; each
library is sound and maintained, and each costs something the template has already decided against.

### The libraries, as checked on 2026-11-11

| | pg-boss 12.38.2 | Graphile Worker 0.18.0 | Our own table |
| --- | --- | --- | --- |
| Maintenance | Active: released the day before | Active: last release two months before | Ours |
| Runtime dependencies | `pg`, `cron-parser`, `rrule-temporal`, `serialize-error` | `pg`, `graphile-config`, `@graphile/logger`, `cosmiconfig`, `yargs`, `json5` and type packages | none new |
| Schema | Its own schema, created and migrated by the library when it starts, or exported as SQL to apply by hand at each upgrade | Its own schema, migrated by the worker when it starts | One migration, `0010_job.sql` |
| Enqueue in our transaction | Yes, by handing it an object that runs its SQL on our connection | Yes, a SQL function (`add_job`) | A Kysely insert on the transaction |
| Finding work | Polling | `listen`/`notify`, with polling behind it | Polling only when something is due |
| Extras | Cron schedules, queues with policies, dead-letter queues, a dashboard project | Cron, batch jobs, a CLI | None |

- Both libraries own their schema and change it when they start. That makes a second migration
  system beside the plain SQL files of ADR 0013, and it needs a runtime role that may create and
  alter tables, or a manual SQL step on every upgrade.
- Graphile Worker's speed comes from `listen`, which holds a session and does not pass a pooler in
  transaction mode; it would need a direct connection beside the pooled one.
- Neither was verified on PGlite, the test database. A queue that tests cannot run would be tested
  only through a fake.
- Neither knows about an idle database's budget: both poll on a fixed interval.
- What they add (cron, priorities, throttling, fan-out) nothing in the template asks for yet.

A queue outside Postgres cannot join a transaction, and is one more service and secret.

### The job

Table `job` (migration `0010_job.sql`), not tenant-scoped: it is the platform's, as `schema_migration`
is. A job for an organization carries the organization's id in its payload.

| Column | |
| --- | --- |
| `id` | Drawn by the `IdGenerator` port |
| `kind` | The name a handler is registered under, `module.what-it-does` |
| `payload` | `jsonb`, validated by the kind's Zod schema when enqueued and again before the handler runs |
| `state` | `pending`, `done` or `failed` |
| `run_at` | Not before this instant: now, a time asked for (a delayed job), or the next retry |
| `attempts` | How many times a worker has taken it |
| `locked_until` | While a worker holds it: the end of its lease |
| `last_error` | The last failure's message, cut to 1 000 characters |
| `created_at`, `finished_at` | |

A kind is a `JobDefinition`: `{ kind, schema, maxAttempts? }` (`#libs/ports/job-queue.port`).

### Enqueueing

`JobQueue.enqueue(definition, payload, { runAt? })` returns the job's id. The Kysely adapter
(`#libs/database/kysely-jobs`) is built on the pool or on a unit of work's transaction, like every
repository (ADR 0052): a module that enqueues with a change adds `jobs` to its unit of work, and a
rollback takes the job with it. The in-memory fake (`#libs/adapters/in-memory-jobs`) implements
`snapshot()`, so the in-memory unit of work rolls it back too. An invalid payload throws at the call:
it is a bug where it is written, not three retries later.

### Running

One worker (`#libs/jobs/job-worker`) takes one job at a time:

- **Claim.** One statement: `update job set attempts = attempts + 1, locked_until = <now + lease>
  where id = (select id … where state = 'pending' and run_at <= now and (locked_until is null or
  locked_until <= now) order by run_at, id limit 1 for update skip locked) returning …`. The row lock
  lasts for that statement only; what keeps a second worker away while the handler runs is the lease,
  a value in the row. So no transaction and no connection is held while a handler works, the 30 s
  idle-in-transaction limit cannot end a job, and each statement stands on its own behind a pooler.
- **Success** sets `done`. **Failure** (the handler throws, takes longer than 60 s, has no
  registration, or its payload no longer passes the schema) sets `run_at` to the retry time and keeps
  the message; at `maxAttempts` (5 unless the kind says otherwise) the job becomes `failed` and stays.
- **Backoff:** 30 s, 2 min, 8 min, 32 min (`30 s × 4^(attempt − 1)`, capped at 6 h): about 43 minutes
  from the first failure to the last attempt, long enough for a provider's incident, short enough
  for an email to still matter.
- **Lease:** 2 minutes, twice the handler's limit. A worker that dies mid-job leaves a lease that
  expires, and the job runs again. Every write that ends an attempt checks `attempts`, so a worker
  that lost its lease cannot overwrite the worker that took over.
- **At-least-once.** A job runs once in the usual case and more than once after a crash, a lost
  lease or a failure after its effect (the email left, then the row could not be marked). **Handlers
  must be idempotent**: write with a key, check before acting, or accept the repeat (a second copy
  of an email is better than none). Nothing is promised about order between jobs.
- **One at a time per worker.** The API's pool has five connections shared with requests; a worker
  that ran five jobs at once could take them all.

### Registering a handler

A module exports a function `registerXJobs(registrar, deps)`, beside its `registerXRoutes`, that
calls `registrar.register(definition, handler)` for each kind. `app/create-jobs.ts` is the
composition root's half for jobs: it builds the adapter, the registry and the worker, and calls each
module's function. A handler receives the parsed payload and `{ jobId, attempt, signal }`; `signal`
aborts when the 60 s pass, and a handler that calls out passes it on (`fetch(url, { signal })`).

### The limits of ADR 0047

- The polling statements (the claim, the next due time) are ordinary statements under the 10 s and
  15 s limits. When the database is out of reach the worker logs `job poll failed` and looks again in
  30 s; it never ends the process.
- A handler's own database work goes through the same ports, pool and limits as a request: each
  statement is bounded, several writes go through a unit of work, and nothing waits inside a
  transaction. Work that needs more than 60 s is split into several jobs, each enqueueing the next
  in its own transaction, as the purge works in batches.

### Where the worker runs

**Both, as a setting** (`JOB_WORKER`, `on` by default):

- **In the API process (default).** The free tier gives one container; a second service is paid on
  the default host. `main.ts` starts the worker after the server listens.
- **A process of its own:** `node dist/worker.js` from the same image and environment, with
  `JOB_WORKER=off` on the API. For a paid plan, or when jobs are heavy enough to compete with
  requests for the event loop or the pool.

**An idle worker does not query.** After a poll that finds nothing, it asks once for the next due
time and sleeps until then, at most `JOB_IDLE_POLL_SECONDS` (one hour by default). An enqueue in
the same process wakes it at once. Because that enqueue may be inside a transaction that has not
committed, the worker looks again 1, 2, 4, 8, 16 and 32 s after an empty poll that follows a wake,
which covers the longest a transaction can last under ADR 0047. A worker in its own process, or a
second API instance, is not woken by another process's enqueue: set `JOB_IDLE_POLL_SECONDS` to a few
seconds there, on a database that is always on anyway.

**What a sleeping container means.** While the API's container sleeps, nothing runs: a job due at
09:00 runs when the next request wakes the container, and the worker's first act is to look for due
work. An immediate job (an email caused by a request) is not affected: the request that enqueued it
is what keeps the container awake. For a delayed job to run on time on a free tier, something must
keep the container awake: the uptime monitor of [operations.md](../operations.md), on an interval
shorter than the host's idle limit. The timer then fires on time and wakes the database only when
something is due. On a paid, always-on instance delayed jobs are on time with no monitor; the
separate worker is then a choice about load, not about correctness.

**Graceful shutdown.** On `SIGTERM` the worker stops claiming, wakes if asleep, and waits up to 10 s
for the job in hand. A job still running then keeps its lease and runs again once it expires:
at-least-once covers it. The database pool closes after the worker stops.

### Visible failures

Log lines in the style of [ADR 0046](0046-observe-through-structured-logs-tagged-with-the-release.md),
each with `jobId`, `kind` and `attempt`, never the payload (it may hold an address or a link):
`job done` (info), `job attempt failed` (warn, with `err` and `retryAt`), `job failed` (error, the
last attempt), `job poll failed` (warn). `failed` rows stay in the table with `last_error`;
[operations.md](../operations.md) has the queries to list and requeue them.

### Purge

The daily purge of ADR 0050 stays where it is, on its schedule: it must run when the API is asleep,
which a job inside the API cannot promise on a free tier. It gains one line: `done` jobs go after 7
days and `failed` ones after 30 (`jobRetention`), in the same batches.

### The first kind: `health.queue-check`

The plan asked for a real kind that proves the path without a product rule. Each time the API
starts it enqueues `health.queue-check` with its release and the time; the handler logs
`job queue working` with how long the job waited. Every deploy and every wake then leaves, in the
log, proof that this environment enqueues, claims and completes, or `job failed` if it does not. It
needs no table, text or screen. Rejected: moving the purge onto the queue (see above), and a job on
deleting a customer (it would need a product rule to have something to do). Identity's emails move
onto the queue next, in a change of their own (ADR 0057).

Sources: [Postgres `select … for update skip locked`](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE),
[pg-boss](https://github.com/timgit/pg-boss), [Graphile Worker](https://worker.graphile.org/docs),
[PgBouncer's pooling modes](https://www.pgbouncer.org/features.html).

### Consequences

- Good: a job commits with its cause; retries, delays and a visible failed state with no new
  dependency, service or secret, on any Postgres and behind any pooler.
- Good: the same queue runs on PGlite, so the adapter, the worker and a handler are tested against
  real SQL; use cases use the fake and `worker.drain()`.
- Good: an idle queue costs no database compute; a free tier's budget is spent only on work.
- Bad: we own and test the queue. No cron, priorities, concurrency above one, rate limits or
  dashboard; each is ours to build when needed.
- Bad: at-least-once puts idempotency on every handler, by convention and review only.
- Bad: on a sleeping container a delayed job is late unless a monitor keeps the container awake.
- Bad: payloads stay in the table until the purge (7 days done, 30 failed). A payload carries ids
  where it can; what it must carry (an email's link) is at rest there for that time.
- Bad: PGlite is one session shared by every connection, so tests show that two workers never take
  the same job, not real lock contention between two sessions.
- Bad: a wake does not cross processes; a separate worker or a second instance trades a short idle
  poll for an always-on database.

## Revisit when

Jobs wait behind one another (raise concurrency, with a pool of its own); a product needs recurring
schedules beyond the daily purge, priorities or per-tenant fairness (compare pg-boss again before
building them); the `job` table grows enough for the claim to show in the slow-query log; or the
host offers a scheduler that can wake a sleeping container at a job's time.
