# 0050. Purge expired rows daily, from a job of its own

- Status: accepted
- Date: 2026-11-08

## Context and problem statement

Nothing removed rows past their use: expired sessions and verification tokens, Better Auth's
rate-limit counters (one per client address and path), invitations that expired as `pending`, and
accounts never confirmed. Two accepted risks of the threat model already said "purge on a schedule",
but nothing did. Tables and their indexes only grow, on a free tier of 0.5 GB (Neon in the template),
and an unconfirmed account keeps blocking its address's Google sign-in.

Where does the purge run, and how long is each kind of row kept?

## Decision drivers

- Works with any Postgres and any host; no extension the test database (PGlite) or another provider
  lacks.
- Never competes with requests, and never trips the statement limit of
  [ADR 0047](0047-put-time-limits-on-every-database-wait.md) on a large backlog.
- Idempotent and observable: a run says how many rows it removed; a missed run costs nothing.
- No new secret and no new paid service.

## Considered options

1. An entry point beside `migrate.ts`, run every day by a GitHub Actions schedule with the
   `production` environment's `DATABASE_URL`, and runnable by any host's cron from the API image.
2. `pg_cron` in the database.
3. The host's cron (a Render cron job, a Kubernetes `CronJob`) only.
4. A timer inside the API process.

## Decision outcome

Chosen option: 1. GitHub already runs the weekly audit on a schedule and already holds the secret the
deploy pushes, so the purge costs no new service, and the same `node dist/purge.js` serves a host that
has its own cron. `pg_cron` is not on every provider nor on PGlite; a host cron is paid on Render's free
plan; a timer in the API runs only while an instance is awake, once per instance, beside its requests.

- **Entry point:** `src/purge.ts` (bundled as `dist/purge.js`, run as `pnpm --filter @repo/api purge`)
  reads only `DATABASE_URL`, `LOG_LEVEL` and `RELEASE` (`loadDatabaseEnv`), calls each module's purge and
  logs `expired rows purged` with the count per kind. A product module whose rows expire adds its
  purge there.
- **Identity's purge** (`purgeExpiredIdentityRows`, retention in `identityRetention`):

  | Rows | Deleted when |
  | --- | --- |
  | Sessions, verification tokens | expired |
  | Rate-limit counters | no request for 24 hours (their windows are 60 s at most) |
  | Invitations still `pending` | expired more than 30 days ago, so support can still see why one failed |
  | Accounts never confirmed | created more than 7 days ago (with their sessions and sign-in methods, by cascade) |

  Accepted, rejected and cancelled invitations stay: they are the organization's history.
- **Batches:** each kind is deleted 5 000 rows per statement until none is left, so a backlog never
  holds a long lock or runs into the 10 s statement limit, and each statement holds behind a
  transaction pooler.
- **Schedule:** `.github/workflows/purge.yml`, daily at 04:30 UTC and by hand, never two at once. Without
  `DATABASE_URL` in the `production` environment (a product not deployed yet) it says so and succeeds,
  instead of failing every day.

### Consequences

- Good: the auth tables stay the size of what is in use; an address squatted by an unconfirmed account
  is free again after a week.
- Good: one command, tested on PGlite, that any scheduler can run.
- Bad: GitHub's runners must reach the database (a provider with an IP allowlist needs GitHub's ranges,
  or the host's cron instead); a `production` environment that requires a reviewer holds each run
  until someone approves it.
- Bad: GitHub pauses a schedule after 60 days without activity in the repository; a paused purge only
  lets rows grow again, and the `Purge` workflow's page shows it.

## Revisit when

The purge takes more than a few minutes, a product must keep some of these rows for an audit, or the
product moves to a host whose scheduler it already uses for other jobs.
