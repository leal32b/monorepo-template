# Operations

How to see what production is doing, and what to do when it misbehaves. The decisions behind it:
[ADR 0014](adr/0014-hosting-and-deploy-from-github-actions.md) (hosting and deploy) and
[ADR 0046](adr/0046-observe-through-structured-logs-tagged-with-the-release.md) (observability),
[ADR 0047](adr/0047-put-time-limits-on-every-database-wait.md) (time limits on the database),
[ADR 0050](adr/0050-purge-expired-rows-daily-from-a-job-of-its-own.md) (the daily purge) and
[ADR 0056](adr/0056-run-background-work-from-a-job-table-in-postgres.md) (background jobs).
Neon, Render and Cloudflare are the template's own hosts; on others, the same signals live elsewhere.

## Signals

| Signal | Where | What it says |
| --- | --- | --- |
| `GET /api/health/live` | The platform's health check (Render) | The process answers; no I/O, so it never wakes the database |
| `GET /api/health` | An uptime monitor, the deploy's smoke test | `ok` or `degraded` (503, the database is down), and the `release` that answers |
| API log | stdout, read in the host's log viewer | One JSON line per request, plus every unexpected error with its stack |
| Worker log | Cloudflare dashboard, Workers Logs | Each request through the web origin, its status and any exception |
| Deploy | GitHub Actions, `Deploy` workflow | Which commit went live, and the smoke tests it passed |
| Purge | GitHub Actions, `Purge` workflow, daily | The log line `expired rows purged`, with how many sessions, tokens, counters, invitations and unconfirmed accounts went, and how many finished jobs |
| Jobs | API log (or the worker's, `service: worker`); the `job` table | `job queue working` after every start; `job attempt failed` and `job failed` when a handler fails; what is waiting, running or failed |

## Reading the API log

Every line has `time`, `level` (30 info, 40 warn, 50 error, 60 fatal), `service`, `release`, `pid`
and `hostname`. A request line adds `reqId`, `method`, `route` (the pattern, such as
`/api/organizations/:organizationId/customers`), `path`, `status` and `durationMs`:

- `request` (info): answered below 400.
- `request rejected` (warn): a 4xx; a burst of 401, 403 or 429 is worth a look.
- `request failed` (error): a 5xx. The line before it with the same `reqId`,
  `unhandled error in request handler`, holds the error and its stack.
- `dependency unavailable` (warn): the database was out of reach or did not answer in time; the
  request answered `503 service_unavailable` and its `reason` says which limit ended the wait. No
  stack: it is not a bug.

A job line has `jobId`, `kind` and `attempt` instead of a request's fields:

- `job done` (info), with `durationMs`.
- `job attempt failed` (warn): the handler threw or ran past 60 s; `err` says why and `retryAt` when
  it runs again (after 30 s, 2 min, 8 min, 32 min).
- `job failed` (error): the last attempt (the fifth, unless the kind says otherwise). The job stays
  in the table as `failed`; see [Background jobs](#background-jobs).
- `job poll failed` (warn): the worker could not reach the database; it looks again in 30 s.
- `job queue working` (info): the check the API enqueues as it starts was run, `waitedMs` after it
  was enqueued.

A job's payload is never logged: it may hold an address or a link.

Headers, cookies and bodies are never logged. Keep it that way: a log line may be read by anyone with
access to the host.

## A user reports a failure

1. Ask for the reference the screen shows under the message ("If it keeps happening, tell support:
   …"): a code and a request id, such as `internal_error · 7f3c…`.
2. Search the API log for that `reqId`. The lines give the route, the status, the release and, for a
   5xx, the stack.
3. The `release` is the commit: `git show <release>` is the code that answered.

No reference on the screen means the browser could not reach the API: look at the Worker log and at
`/api/health`.

## Background jobs

Work that runs after a request answers, or at a time, is a row in the `job` table
([ADR 0056](adr/0056-run-background-work-from-a-job-table-in-postgres.md)): `pending` until a
worker runs it, then `done`, or `failed` after its last attempt. The worker runs inside the API
process unless `JOB_WORKER=off`, and then in a process of its own (`node dist/worker.js`). The daily
purge deletes `done` jobs after 7 days and `failed` ones after 30.

What is in the queue, in the database's SQL console (payloads may hold personal data: select the
columns you need, not `*`):

```sql
-- How many of each kind, by state.
select kind, state, count(*) from job group by kind, state order by kind, state;

-- Failed: every attempt was used. The message is the last error; the log has the stack (`jobId`).
select id, kind, attempts, last_error, finished_at from job where state = 'failed' order by finished_at desc;

-- Waiting past their time: the worker is not running, or each is held by a lease or a retry.
select id, kind, attempts, run_at, locked_until, last_error from job
where state = 'pending' and run_at < now() - interval '5 minutes' order by run_at;
```

Reading a `pending` row: `attempts = 0` has never run; `locked_until` in the future is running now,
or its worker died and it runs again when the lease ends (2 minutes at most); `last_error` set and
`run_at` in the future is waiting for its retry.

Put a failed job back once its cause is fixed (a provider back up, a secret corrected, a handler
deployed). It gets all its attempts again:

```sql
update job set state = 'pending', attempts = 0, run_at = now(), finished_at = null where id = '<id>';
```

The worker sees it at its next look: at once after any enqueue or restart, within
`JOB_IDLE_POLL_SECONDS` (an hour by default) otherwise. To drop a job instead, delete its row.
Handlers are written to bear a repeat, so running a job twice is safe.

On a host whose container sleeps when idle, nothing runs while it sleeps: a job due at 09:00 runs
when the next request wakes the container. Jobs caused by a request are not affected. For delayed
jobs to run on time, keep the container awake (the uptime monitor below, on an interval shorter
than the host's idle limit) or move to an always-on plan. An idle worker sends no queries, so
keeping the container awake does not keep the database awake.

## Set up once per product

- An uptime monitor (any free one) on `<web origin>/api/health` every 5 to 10 minutes, alerting on a
  status other than 200. Each check wakes the database: a shorter interval spends its free compute.
  It also keeps a sleeping container awake, which is what makes a delayed job run on time there.
- Notifications for a failed `Deploy`, `Audit` or `Purge` workflow in GitHub (on by default for the person who
  triggered the run).
- If the host's log retention is too short, a log drain to a log service; the lines are already JSON.
- The API and the database in the same region. A signed-in request makes at least two sequential
  database round trips (the session, then the membership with its roles), so each millisecond
  between them counts at least twice on every tenant route.

## When something breaks

| Symptom | First look |
| --- | --- |
| `/api/health` answers 503 | The database: Neon's status page and the project's compute; the API log's `idle database connection lost` |
| Calls answer 503 `service_unavailable` after up to about 25 s | API log: `dependency unavailable` and its `reason`. `timeout exceeded when trying to connect` means every connection was busy (a slow query holding them, or more traffic than five connections serve); `Query read timeout`, a code `57014` or a connection error point at the database: `/api/health`, then the provider's status and the project's compute. The API recovers on its own once the database answers; a restart does not help |
| The `Purge` workflow fails, or stopped running | Its log: `purge failed` with the error, or `Invalid environment: DATABASE_URL`. A runner that cannot connect means the database refuses GitHub's addresses: allow them, or run `node dist/purge.js` from the API image on the host's cron. GitHub pauses a schedule after 60 days without activity: enable it again on the workflow's page. A missed day only lets rows wait |
| `/api/health` does not answer | Render: the service's events and log; a crash leaves a `fatal` line |
| Pages load, every call fails | Worker log: an exception there means the Worker cannot reach `API_ORIGIN`; a 403 from the API means `PROXY_SECRET` differs between the Worker and the API |
| `job failed` in the log, or something that should have happened later did not | [Background jobs](#background-jobs): the failed rows and their `last_error`; fix the cause, then put them back |
| Jobs wait and nothing runs them | No `job queue working` line after the last start means no worker runs: `JOB_WORKER=off` on the API with no worker process beside it, or the worker process is down (its log, `service: worker`). `job poll failed` means the database is out of reach. A delayed job that ran late on a free tier waited for the container to wake |
| Emails do not arrive | API log: `email not sent` with the provider's error; the sender domain in Resend |
| The deploy fails at the smoke test | The step's output: which check failed, and the `release` that answered |
| The first request after a quiet time takes about a minute | Expected on free tiers: Render and Neon wake up; the web says so after 5 s ([ADR 0041](adr/0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)) |

**Roll back** by reverting the commit on `main`: CI and the deploy run again. Faster, while that
runs: deploy the previous image (`ghcr.io/<owner>/<repo>-api:<sha>`) from Render's dashboard, and
`wrangler rollback` for the web. The next deploy from `main` replaces both. Migrations only move
forward, so a rollback past a migration needs a new migration that undoes it.
