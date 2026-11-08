# Operations

How to see what production is doing, and what to do when it misbehaves. The decisions behind it:
[ADR 0014](adr/0014-hosting-and-deploy-from-github-actions.md) (hosting and deploy) and
[ADR 0046](adr/0046-observe-through-structured-logs-tagged-with-the-release.md) (observability) and
[ADR 0047](adr/0047-put-time-limits-on-every-database-wait.md) (time limits on the database).
Neon, Render and Cloudflare are the template's own hosts; on others, the same signals live elsewhere.

## Signals

| Signal | Where | What it says |
| --- | --- | --- |
| `GET /api/health/live` | The platform's health check (Render) | The process answers; no I/O, so it never wakes the database |
| `GET /api/health` | An uptime monitor, the deploy's smoke test | `ok` or `degraded` (503, the database is down), and the `release` that answers |
| API log | stdout, read in the host's log viewer | One JSON line per request, plus every unexpected error with its stack |
| Worker log | Cloudflare dashboard, Workers Logs | Each request through the web origin, its status and any exception |
| Deploy | GitHub Actions, `Deploy` workflow | Which commit went live, and the smoke tests it passed |

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

## Set up once per product

- An uptime monitor (any free one) on `<web origin>/api/health` every 5 to 10 minutes, alerting on a
  status other than 200. Each check wakes the database: a shorter interval spends its free compute.
- Notifications for a failed `Deploy` or `Audit` workflow in GitHub (on by default for the person who
  triggered the run).
- If the host's log retention is too short, a log drain to a log service; the lines are already JSON.

## When something breaks

| Symptom | First look |
| --- | --- |
| `/api/health` answers 503 | The database: Neon's status page and the project's compute; the API log's `idle database connection lost` |
| Calls answer 503 `service_unavailable` after up to about 25 s | API log: `dependency unavailable` and its `reason`. `timeout exceeded when trying to connect` means every connection was busy (a slow query holding them, or more traffic than five connections serve); `Query read timeout`, a code `57014` or a connection error point at the database: `/api/health`, then the provider's status and the project's compute. The API recovers on its own once the database answers; a restart does not help |
| `/api/health` does not answer | Render: the service's events and log; a crash leaves a `fatal` line |
| Pages load, every call fails | Worker log: an exception there means the Worker cannot reach `API_ORIGIN`; a 403 from the API means `PROXY_SECRET` differs between the Worker and the API |
| Emails do not arrive | API log: `email not sent` with the provider's error; the sender domain in Resend |
| The deploy fails at the smoke test | The step's output: which check failed, and the `release` that answered |
| The first request after a quiet time takes about a minute | Expected on free tiers: Render and Neon wake up; the web says so after 5 s ([ADR 0041](adr/0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)) |

**Roll back** by reverting the commit on `main`: CI and the deploy run again. Faster, while that
runs: deploy the previous image (`ghcr.io/<owner>/<repo>-api:<sha>`) from Render's dashboard, and
`wrangler rollback` for the web. The next deploy from `main` replaces both. Migrations only move
forward, so a rollback past a migration needs a new migration that undoes it.
