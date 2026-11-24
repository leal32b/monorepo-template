# 0078. Deploy an optional staging environment from the same workflow, and restore the database from the provider's history

- Status: accepted; amends [0014](0014-hosting-and-deploy-from-github-actions.md)
- Date: 2026-11-24

## Context and problem statement

[ADR 0014](0014-hosting-and-deploy-from-github-actions.md) deploys one environment, `production`. A
migration first meets real data in production, and nothing says how to get the database back after a bad
migration, a wrong delete or a provider's incident. The integrations added since (Asaas, ADR 0064; R2,
ADR 0076; Google sign-in, ADR 0020) each hold state or credentials that a second environment must not
share. Where does a second environment live, what deploys it, how is a migration tried on real-shaped
data, and how is the database restored?

What the providers' documentation said, read on 2026-11-24:

| Provider | Fact | Source |
| --- | --- | --- |
| Neon | Restore window: Free "6 hours, up to 1 GB of change history per project"; Launch up to 7 days; Scale up to 30 days. The default window is 6 hours on Free and **1 day** on paid plans; it is set per project. History storage costs $0.20/GB-month on paid plans | [Plans](https://neon.com/docs/introduction/plans) (updated 2026-11-18) |
| Neon | Instant restore rewrites a **root** branch in place: same name, "your connection details do not change", connections dropped briefly, "a few seconds". The previous state is kept as a branch `<name>_old_<timestamp>`, and restoring from it undoes the restore. Child branches cannot be restored in place | [Instant restore](https://neon.com/docs/introduction/branch-restore) (updated 2026-11-06) |
| Neon | A child branch is a copy-on-write clone of its parent's data, and gets the parent's roles **and passwords**. A branch can be created from a past point inside the window, and can expire on its own. Free: 10 branches per project, 100 projects, 100 CU-hours and 1 GB per project | [Branches](https://neon.com/docs/manage/branches) (2026-11-14), [Plans](https://neon.com/docs/introduction/plans) |
| Neon | Anonymized branches mask data through PostgreSQL Anonymizer, and schema-only branches copy no rows; both are in beta | [Data anonymization](https://neon.com/docs/workflows/data-anonymization) (2026-11-20), [Schema-only branches](https://neon.com/docs/guides/branching-schema-only) (2026-11-10) |
| Render | 750 free instance hours **per workspace** a month; when they run out, Render "suspends all of your Free web services until the start of the next month". A Hobby workspace has up to two environments per project | [Free instances](https://render.com/docs/free), [Projects](https://render.com/docs/projects) |
| Cloudflare | A Wrangler environment deploys a Worker named `<name>-<environment>` (`wrangler deploy --env staging`); vars, bindings and secrets are not inherited and are set per environment | [Environments](https://developers.cloudflare.com/workers/wrangler/environments/) |

## Decision drivers

- Production's deploy keeps every check it has, and a product that never sets up staging sees no change.
- A second environment shares no secret, bucket, database, webhook or OAuth client with production, so a
  mistake there cannot reach production's users, money or files.
- A migration is tried on data shaped like production's before production runs it, without copying
  personal data into a place with weaker access.
- Restoring the database is a runbook an owner follows in under 30 minutes, on any Postgres host.
- Free tiers stay usable: staging must not spend production's compute or instance hours.

## Considered options

What deploys staging:

1. A manual run of `Deploy` with an environment input, on any branch whose commit passed CI.
2. Every push to a `staging` branch.
3. Every push to `main`, before production.
4. A preview per pull request.

Where staging's database lives:

1. A child branch of production's Neon branch.
2. A separate Neon project (on another host, a second database with its own user).
3. A schema-only branch in production's project.

Where a migration meets real-shaped data:

1. A copy of production in staging.
2. A short-lived branch of production that only the migration command touches, then deleted.
3. An anonymized branch of production.

How the database is restored:

1. The provider's point-in-time restore: in place on Neon; into a new database, then switching
   `DATABASE_URL`, on a host that restores only that way.
2. Nightly logical dumps (`pg_dump`) to a bucket of our own, restored with `pg_restore`.

## Decision outcome

**Staging is optional, deployed by option 1.** `Deploy` keeps its trigger after CI on `main`, which is
always `production`. Its manual run gains an input `environment`, `production` (the default) or
`staging`:

- `production` takes `main` only, as before.
- `staging` takes any branch of this repository whose commit has a green `CI` run (a push to a branch with
  an open pull request), so a branch is tried in staging before it merges. Only people who can run
  workflows can deploy it, and the GitHub environment's deployment branch rule can narrow that.
- The jobs run in the GitHub environment the input names, with its own secrets and variables, and a
  concurrency group per environment. Every check of production runs for staging: the configuration
  check, the origin and storage endpoint shapes, the Asaas key against its URL, the smoke tests of the API,
  the Worker, the headers and the release. Staging adds one: its Asaas URL must be the sandbox's.
- The Worker is the `staging` environment of `apps/web/wrangler.jsonc`, deployed as `<name>-staging`
  with its own `API_ORIGIN` and `PROXY_SECRET`.
- A product without staging is unaffected: nothing runs `staging` unless someone chooses it, and a
  staging run with no `staging` environment stops at the configuration check, naming what to set. The
  daily purge (ADR 0050) stays on production only; staging's expired rows wait, which is harmless at its
  size.

Options 2 and 3 deploy staging without anyone choosing it, which is what a product with a team and
shared staging may later want: it is a trigger to add, not a different design. Option 4 needs a database
and an API per pull request, far past free tiers.

**Staging's database is option 2.** A child branch (option 1) would carry production's personal data and
the same role passwords, so staging's `DATABASE_URL` would open production's roles; it also spends
production's compute budget and branch allowance. A separate project has its own credentials and its own
free allowance. Option 3 is in beta and is a root branch of production's project, sharing its limits.

**What staging never shares with production:**

| Item | Staging has its own |
| --- | --- |
| Database | Project (or database) and user; never a copy of production's rows |
| API host | Service; on Render's free plan, in another workspace, so staging's hours never suspend production |
| Worker | `<name>-staging`, on its own `*.workers.dev` host |
| Secrets | `BETTER_AUTH_SECRET`, `PROXY_SECRET`, `ASAAS_WEBHOOK_TOKEN`, each from `openssl rand -hex 32` |
| Files | R2 bucket, with a token scoped to that bucket and a CORS rule naming the staging origin only |
| Billing | Asaas sandbox account, key and webhook (the deploy refuses anything else) |
| Google sign-in | OAuth client, or none: production's client never lists a staging redirect URI |
| Email | Resend API key (the verified domain may be the same; a sender such as `staging@` tells them apart) |
| Deploy credentials | `RENDER_API_KEY` from the staging workspace's account and a `CLOUDFLARE_API_TOKEN` of its own |

**Migrations are tried twice before production runs them.** First on staging, which runs them when its
API starts, on staging's own data. Then, for a migration that rewrites or constrains existing rows, on
**a short-lived branch of production** (option 2): created with an expiry, migrated from the machine of
someone who already holds production's `DATABASE_URL`, checked, and deleted. No API, worker or job ever
runs on it, so no email, charge or webhook can leave it.

Personal data (LGPD): the branch is the same data, processed by the same controller, on the same provider
and region, under the same people's access, for the purpose the data is already kept for (running the
service), and it is deleted within a day. The template takes that as the default. It never copies
production into staging (option 1), where more people, a sandbox and test emails would reach real
people's data. A product that needs real-shaped data for longer, or by people without production access,
uses an anonymized branch (option 3) once that leaves beta, or seeds staging; its data protection officer
decides.

**Backups are the provider's point-in-time restore (option 1).** On Neon the production branch is a root
branch, restored in place: the connection string does not change, so the API is switched over by
restarting it, and switched back by restoring from the `_old_` branch Neon keeps. On another host, the
restore makes a new database; the switch is setting `DATABASE_URL` to it and re-running `Deploy`, and the
switch back is the old value and another run. Before restoring, the state at the chosen point is checked on
a branch made from that point. The steps and the rehearsal's timing are in
[operations.md](../operations.md#restore-the-database).

The window is the plan's: 6 hours on Neon's Free plan, which only covers a mistake seen the same day. A
product with paying customers moves production to a paid plan and sets the window to 7 days (Launch) or
more; the paid default of 1 day must be raised by hand. Option 2 would cover longer, but it is a job, a
bucket and a restore drill of our own, with dumps holding personal data outside the database; it waits for
a product whose host cannot keep enough history.

What a restore does not bring back, and the template does not cover:

- **Files in R2.** Objects have no history here: a logo deleted after the point is gone and its
  organization shows its letter; objects uploaded after the point stay, unreferenced, until removed by
  hand. Exports are short-lived anyway.
- **Asaas.** Charges, payments and subscriptions changed after the point exist at Asaas but not in the
  database, and their notices were already taken in. They are reconciled by hand from Asaas's dashboard.
- **What already left.** Emails sent after the point stay sent; jobs that were waiting at the point run
  again, so some emails may go twice. Accounts, sign-ins and changes after the point are lost.

### Consequences

- Good: a branch is seen running on real infrastructure, with the sandbox and its own bucket, before it
  reaches `main`; production's path and checks are unchanged.
- Good: staging cannot charge anyone, read production's files or open production's database, by
  construction rather than by care.
- Good: a restore on Neon takes seconds and is undone the same way, without touching GitHub or Render's
  variables.
- Bad: staging doubles the accounts and secrets the owner keeps, and the owner keeps them apart by hand;
  the workflow can check only the Asaas sandbox, since a job never sees another environment's values.
- Bad: on free tiers staging needs a second Render workspace, and its Worker shares the Cloudflare
  account's free request allowance with production.
- Bad: `wrangler deploy` warns on production that environments exist and none was named; the warning
  is harmless and is the price of declaring staging in the same file.
- Bad: Neon's Free window is 6 hours, so a mistake found the next day cannot be undone there; and a
  restore leaves R2 and Asaas to reconcile by hand.

## Revisit when

A team needs staging deployed on every merge (add a trigger); a product's host cannot keep 7 days of
history, or a regulator asks for backups kept outside the provider (nightly dumps); Neon's anonymized
branches leave beta (real-shaped staging); or Render stops counting free hours per workspace.
