# Operations

How to see what production is doing, and what to do when it misbehaves. The decisions behind it:
[ADR 0014](adr/0014-hosting-and-deploy-from-github-actions.md) (hosting and deploy) and
[ADR 0046](adr/0046-observe-through-structured-logs-tagged-with-the-release.md) (observability),
[ADR 0047](adr/0047-put-time-limits-on-every-database-wait.md) (time limits on the database),
[ADR 0050](adr/0050-purge-expired-rows-daily-from-a-job-of-its-own.md) (the daily purge),
[ADR 0056](adr/0056-run-background-work-from-a-job-table-in-postgres.md) (background jobs) and
[ADR 0059](adr/0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md) (public routes and their rate limits) and
[ADR 0072](adr/0072-report-browser-errors-to-the-api-log.md) (browser errors).
Neon, Render and Cloudflare are the template's own hosts; on others, the same signals live elsewhere.

## Signals

| Signal | Where | What it says |
| --- | --- | --- |
| `GET /api/health/live` | The platform's health check (Render) | The process answers; no I/O, so it never wakes the database |
| `GET /api/health` | An uptime monitor, the deploy's smoke test | `ok` or `degraded` (503, the database is down), and the `release` that answers |
| API log | stdout, read in the host's log viewer | One JSON line per request, plus every unexpected error with its stack |
| Worker log | Cloudflare dashboard, Workers Logs | Each request through the web origin, its status and any exception |
| Deploy | GitHub Actions, `Deploy` workflow | Which commit went live, and the smoke tests it passed |
| Purge | GitHub Actions, `Purge` workflow, daily | The log line `expired rows purged`, with how many sessions, tokens, counters, invitations and unconfirmed accounts went, how many finished jobs, how many of our own rate-limit counters, and how many audit entries older than a year ([ADR 0061](adr/0061-keep-one-append-only-audit-trail-per-organization.md)) |
| Browser errors | API log | `client error` (warn): an error the browser could not handle, with the commit that threw it and the reference the user saw ([Browser errors](#browser-errors)) |
| Rate limits | API log; the `rate_limit` table | `rate limited` when an address passes a limit of a public route, with the limit's name; which addresses are counting now |
| Jobs | API log (or the worker's, `service: worker`); the `job` table | `job queue working` after every start; `job attempt failed` and `job failed` when a handler fails; what is waiting, running or failed |
| Billing | API log; the `webhook_event`, `job` and `subscription` tables | `webhook received` per notice (`repeat: true` for one already taken in), `webhook refused` (warn), `billing synced` with the audit action, `billing event ignored`, and at error `billing duplicate subscription` or `billing reference names another organization` |

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

Two lines come from the public routes (`/api/public/...`,
[ADR 0059](adr/0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)), each with
the `reqId` of its request line:

- `rate limited` (warn): an address passed a limit; `limit` names it (`public-read`,
  `public-write`) and `retryAfterSeconds` is what the 429 told the caller. The address is not in the
  log: see [Public routes and rate limits](#public-routes-and-rate-limits).
- `public write ignored` (info), with `reason: honeypot`: a request filled the field no person
  sees, got the usual answer and wrote nothing. A script, almost always.

A job line has `jobId`, `kind` and `attempt` instead of a request's fields:

- `job done` (info), with `durationMs`.
- `job attempt failed` (warn): the handler threw or ran past 60 s; `err` says why and `retryAt` when
  it runs again (after 30 s, 2 min, 8 min, 32 min).
- `job failed` (error): the last attempt (the fifth, unless the kind says otherwise). The job stays
  in the table as `failed`; see [Background jobs](#background-jobs).
- `job poll failed` (warn): the worker could not reach the database; it looks again in 30 s.
- `job queue working` (info): the check the API enqueues as it starts was run, `waitedMs` after it
  was enqueued.

A job's payload is never logged: it may hold an address or a link. Identity's emails are jobs of the
kind `identity.send-email` ([ADR 0057](adr/0057-send-identity-emails-through-the-job-queue.md)):
a provider's refusal shows as `job attempt failed`, with the provider's status and error code in
`err`, and an email that failed every attempt as `job failed`.

A browser error is a line of its own: see [Browser errors](#browser-errors).

Headers, cookies and bodies are never logged. Keep it that way: a log line may be read by anyone with
access to the host.

## A user reports a failure

1. Ask for the reference the screen shows under the message ("If it keeps happening, tell support:
   …"): a code and a request id, such as `internal_error · 7f3c…`.
2. Search the API log for that `reqId`. The lines give the route, the status, the release and, for a
   5xx, the stack.
3. The `release` is the commit: `git show <release>` is the code that answered.

A reference that starts with `client_error` is not a request id but a browser error: search the log for the
hex part, as in [Browser errors](#browser-errors).

No reference on the screen means the browser could not reach the API: look at the Worker log and at
`/api/health`.

## Browser errors

A screen that throws while it draws, an uncaught error and an uncaught promise rejection are posted by the
browser to `POST /api/client-errors` ([ADR 0072](adr/0072-report-browser-errors-to-the-api-log.md)) and leave one
`warn` line, `client error`. The screen of a crash shows the reference as `client_error · 3fa9c1d2e4b5`; search the
log for the 12 hex characters (`reference`). The line has:

- `release`: the API that took the report. `clientRelease`: the commit of the **web build that threw**, which an
  old tab keeps until it is reloaded. `git show <clientRelease>` is the code; its stack is the minified one, read
  against that commit's build.
- `kind` (`render`, `error` or `unhandledrejection`), `route` (the router's pattern, such as
  `/:organizationSlug/customers/:customerId`, never the address), `clientMessage` and `clientStack`.
- `reqId`, the request that carried the report.

A spike of these lines right after a deploy, all with the new `clientRelease`, is a bad release: roll back. Lines
with an old `clientRelease` are tabs not yet reloaded. Reports are limited to 5 per page and 30 per address per 10
minutes (`client-errors` in the `rate limited` line), so a count is a floor, not a total. Messages are cleaned of
email addresses and query strings, but may still quote what a library put in them: treat them as logs, not as a
place for personal data.

## Background jobs

Work that runs after a request answers, or at a time, is a row in the `job` table
([ADR 0056](adr/0056-run-background-work-from-a-job-table-in-postgres.md)): `pending` until a
worker runs it, then `done`, or `failed` after its last attempt. The worker runs inside the API
process unless `JOB_WORKER=off`, and then in a process of its own (`node dist/worker.js`). The daily
purge deletes `done` jobs after 7 days and `failed` ones after 30. A kind whose payload is a
credential, such as `identity.send-email` with its link, has its payload set to `null` as soon as
the job ends, done or failed.

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
deployed). It gets all its attempts again. A failed `identity.send-email` cannot come back: its
payload is gone, and its link has expired or nearly; the user asks again from the screen (a new
confirmation, reset or deletion email) and an inviter presses Resend:

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

## Public routes and rate limits

Routes under `/api/public/organizations/:organizationSlug` answer without a session
([ADR 0059](adr/0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)), still
through the Worker. Each counts its request first, per client address: 60 reads a minute and 10
writes per 10 minutes (`publicLimits` in `apps/api/src/modules/identity/public-route.ts`). Past a
limit the answer is `429 rate_limited` with `Retry-After`, until the window ends. The counters are
rows of the `rate_limit` table, one per limit and address, deleted by the daily purge a day after
their window started. Better Auth keeps its own counters, for its own routes, in `auth."rateLimit"`.

Who is counting, in the database's SQL console (a key ends in a client address, which is personal
data):

```sql
-- The busiest counters of the last hour. An IPv6 address shows as its /64.
select key, count, window_start from rate_limit
where window_start > now() - interval '1 hour' order by count desc limit 20;

-- Requests with no usable address share this one. A count that grows in production means the
-- proxy in front stopped sending X-Client-IP.
select key, count, window_start from rate_limit where key like '%:unknown';
```

To let one address through again before its window ends, delete its row. What visitors created, to
tell a flood from real use (the audit trail marks it, [ADR 0061](adr/0061-keep-one-append-only-audit-trail-per-organization.md)):

```sql
select organization_id, count(*) from audit_entry
where action = 'created' and actor_kind = 'visitor' and at > now() - interval '1 day'
group by organization_id order by count(*) desc;
```

## Billing and the provider's webhook

A provider's notice arrives at `POST <web origin>/api/webhooks/<provider>` through the Worker
([ADR 0063](adr/0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md),
[ADR 0067](adr/0067-settle-what-adr-0063-left-open-in-the-billing-port-routes-and-jobs.md)). Only the
configured provider's path exists. The route authenticates the notice, records its event id in
`webhook_event` and enqueues one `billing.sync-subscription` job in the same transaction, then
answers 200; a repeat answers 200 and enqueues nothing. The job reads the provider's current state
and writes it into the organization's `subscription` row, with an audit entry by the system. With
no provider key set the API bills through the fake, which takes commands at
`/api/webhooks/fake` (`.env.example` lists them); env validation refuses it when `WEB_ORIGIN` is
https.

What arrived and what it did, in the database's SQL console:

```sql
-- The last notices taken in, per provider.
select source, event_id, received_at from webhook_event order by received_at desc limit 20;

-- Their jobs: done, waiting for a retry, or failed (the payload is the provider's ids, never personal data).
select id, state, attempts, last_error, payload, created_at from job
where kind in ('billing.sync-subscription', 'billing.cancel-at-provider') order by created_at desc limit 20;

-- An organization's subscription and its last changes.
select s.status, s.plan, s.next_plan, s.paid_through, s.past_due_since, s.cancel_at_period_end,
       s.checkout_kind, s.checkout_plan, s.provider_subscription_id, s.version
from subscription s join auth.organization o on o.id = s.organization_id where o.slug = '<slug>';
select at, actor_kind, action, fields from audit_entry
where resource_type = 'subscription' and resource_id = '<organization id>' order by at desc limit 20;
```

**A dead billing job.** `job failed` with `kind: billing.sync-subscription` means the provider could
not be read for about 43 minutes (its five attempts), or the row kept moving under it. Nothing is
lost: the next notice for that subscription reads the whole state again. To apply the state now,
once the provider answers, put the job back as any other (the `update job …` of
[Background jobs](#background-jobs)): it reads the provider again, so running it twice is safe. A
failed `billing.cancel-at-provider` left a deleted organization's subscription live at the
provider: put it back, or cancel the subscription in the provider's dashboard.

**Replaying a notice** the API never took in (a webhook down for longer than the provider resends,
or an event the dashboard lists but `webhook_event` does not): resend it from the provider's
dashboard, or enqueue its sync by hand with the ids it names, which reads the current state:

```sql
insert into job (id, kind, payload, run_at, created_at)
values (gen_random_uuid()::text, 'billing.sync-subscription',
        '{"provider": "asaas", "eventId": "manual-<date>", "subscriptionId": "<provider subscription id>"}',
        now(), now());
```

**A provider whose queue stopped.** Asaas interrupts its webhook queue after 15 failed deliveries in
a row and keeps events for 14 days ([ADR 0064](adr/0064-start-billing-on-asaas-because-stripe-cannot-charge-recurring-pix-in-brazil.md)).
Signs: no `webhook received` for a while, and owners whose page keeps saying the payment is being
confirmed. Restart it in the dashboard, or with `PUT /v3/webhooks/{id}` and `{"interrupted": false}`;
the stored events then arrive.

## Asaas

The first real provider ([ADR 0064](adr/0064-start-billing-on-asaas-because-stripe-cannot-charge-recurring-pix-in-brazil.md),
[ADR 0069](adr/0069-build-the-asaas-adapter-customer-first-and-read-a-scheduled-end-again-on-its-date.md),
[ADR 0070](adr/0070-pay-every-asaas-method-on-an-invoice-made-by-the-api-not-on-its-checkout.md)). Every method
subscribes on a subscription made by the API and is paid on its first charge's invoice, where the payer types a
card, scans a Pix or prints a boleto; an upgrade is a one-off charge paid on its invoice. Asaas's Checkout is not
used.
`ASAAS_API_KEY` selects it; `ASAAS_API_URL` and `ASAAS_WEBHOOK_TOKEN` are then required, and env
validation refuses a key whose prefix does not match the URL (`$aact_hmlg_` for
`https://api-sandbox.asaas.com/v3`, `$aact_prod_` for `https://api.asaas.com/v3`) and a token that is
not 32 to 255 characters without spaces, or that is the key. With the key set, `/api/webhooks/asaas`
takes the notices and `/api/webhooks/fake` answers 404.

### What the owner creates in Asaas

The accounts and keys are the owner's; the template creates none. For each environment (the
sandbox for staging, production for the product):

1. **The account.** The sandbox at `sandbox.asaas.com`, separate from production. Production goes
   through Asaas's approval of the business's documents: check that **Pix is on** once approved, since
   Asaas may leave it off depending on the account's data.
2. **An API key** (Integrações → Chaves de API), kept only in the GitHub secret `ASAAS_API_KEY`. Asaas
   shows it once.
3. **A webhook** (Integrações → Webhooks): URL `https://<web origin>/api/webhooks/asaas`, the token of
   `ASAAS_WEBHOOK_TOKEN` (`openssl rand -hex 32`), API version 3, enabled, either delivery mode, an
   email for Asaas's notices about the queue, and these events: `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`,
   `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`,
   `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_DELETED`, `SUBSCRIPTION_CREATED`,
   `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED`. Another event (the
   `CHECKOUT_*` ones of before ADR 0070 included) is answered 200 and ignored.
4. **Payer notices** (Configurações → Notificações): keep the due-date warning and the overdue notice,
   the only billing emails until P1-6. The default overdue notice includes a phone call; turn it off
   if that is too much for the product's customers.
5. **Charges created 7 days ahead** of their due date (40 by default, 14 or 7 as options), so a payer
   does not see next month's boleto at the start of this one.
6. **Card tokenization** in production: Asaas changes a card subscription's value (an upgrade, a
   downgrade) only with it, and enables it on request to its support. The sandbox has it.
7. **The site** (Minha Conta → Informações → Site): the web origin. Until one is registered, Asaas
   refuses to send the payer back to the plan page after paying, and the adapter creates the charge
   without the way back: paying works, but the payer returns to the app by themselves.

The plan page asks the owner whom the charges name (name, CPF or CNPJ, email) before a subscription's
first payment: Asaas refuses a Pix or a boleto for a customer without a document. The template keeps
none of it; Asaas holds the customer, whose `externalReference` is the organization's id, as it is on
every subscription and charge the adapter creates.

### Trying it in the sandbox

A local API cannot receive Asaas's notices (they need a public https URL): `pnpm dev` keeps the fake.
Try Asaas on a staging environment on https with the sandbox's key and URL and a sandbox webhook to
its origin. Pay a card on its invoice with Asaas's fictitious test cards (Visa `4539 6560 4839 2220`
approves; the documented refusal card was approved too on 2026-11-18); pay a Pix by its QR code;
confirm a boleto with `POST /v3/sandbox/payment/{id}/confirm`, which makes it `RECEIVED` at once (it
fails for a Pix, and leaves the charge a boleto); make a charge late with
`POST /v3/sandbox/payment/{id}/overdue` (both with the sandbox key in `access_token`). Each change
arrives as a notice; `webhook_event` and the job show what it did.

### Rotating the webhook token

The token is one value on both sides, so notices fail with 401 between the two changes, and Asaas
sends them again; keep the gap short, well under fifteen failed deliveries.

1. Generate a new token and set it as the `ASAAS_WEBHOOK_TOKEN` secret of the `production`
   environment.
2. Run the `Deploy` workflow, which pushes it to the API's host.
3. As soon as it is live, set the same token on the webhook in Asaas (dashboard, or
   `PUT /v3/webhooks/{id}` with `{"authToken": "<token>"}`).
4. Check that `webhook refused` lines stop and `webhook received` ones come back. If the queue stopped
   meanwhile, restart it (below).

Rotate the API key the same way: create a new key in Asaas, set the secret, deploy, then disable the
old key in Asaas. The key in use is the only one that must work: calls with the old one fail with 401
and answer the owner 503 until the deploy is live.

### When something goes wrong

- **A dead billing job** (`job failed`, `kind: billing.sync-subscription`, `provider: asaas`): Asaas
  could not be read for about 43 minutes, or answered something the adapter refuses. `last_error`
  names the call, its status and Asaas's error codes (`… answered 401 invalid_access_token` is the
  key; `… did not answer` is Asaas slow or out of reach; `answered 429` is a quota: 25,000 calls per
  12 hours, or 50 reads at once). Fix the cause, then put the job back: it reads Asaas again. A job
  whose `eventId` starts with `period-end:` is the reading of a scheduled end on its date; until it
  runs, the organization stays on its plan with the end scheduled.
- **The queue stopped** after fifteen failed deliveries: see "A provider whose queue stopped" above.
  A free host asleep costs a failure or two (Asaas waits 10 s for an answer), which the next success
  resets; a host down for hours can stop it.
- **A boleto paid after its checkout lapsed.** A first boleto paid at the bank on its due date may
  clear after the job deleted its subscription (the checkout lapses when the charge falls overdue).
  The money arrives at Asaas with no subscription: refund it from the dashboard, and the owner
  subscribes again.
- **`payer_required` (400)** means a subscription's checkout was sent without the payer while Asaas
  knows no customer for the organization; the plan page always sends it, so look for a client that
  does not.
- **"Cancel the upgrade" answers 503 right after a boleto upgrade was opened.** For a few seconds
  after it is created, Asaas answers 500 to deleting a boleto whose registration ends at its due date
  (sandbox, 2026-11-18); trying again a moment later works, and the job retries by itself when it is
  the one withdrawing it.

### What the sandbox showed

Run on 2026-11-18 against the sandbox, through the API and through the adapter itself (its
`startCheckout`, `startPayment`, `payment`, `cancelCheckout`, `paymentPage`, `changePlan`, `cancel`,
`resume` and `subscription`). A local machine receives no notices, so nothing below went through the
webhook; the test data was deleted afterwards. A point the sandbox answers differently later changes
the adapter.

| Point | Result | How |
| --- | --- | --- |
| A card through a subscription made by the API (ADR 0070) | Verified: accepted with no card data; its first charge exists at once with an invoice; once paid by card, the subscription holds the card (brand, last digits, token) and each charge created after it carries it | Created one, paid its first charge with a test card through the invoice's own call (`payWithCreditCard`), read the subscription and the charges the sandbox then created |
| Asaas charging the kept card on a later due date | Not verified: a charge moved to today was still pending 20 s later; Asaas charges cards in a daily run | Moved a pending charge's due date to today |
| Pix through a recurring Checkout (ADR 0064, 1) | Verified, refused: `RECURRENT` takes only `CREDIT_CARD`, and Pix only `DETACHED`. The Checkout is no longer used | Created one |
| A Checkout given our customer | Refused unless the customer has a phone and an address, hence ADR 0070 | The deployed app's first card subscription |
| Customer's CPF or CNPJ (2) | Verified: a customer is created without one, but a Pix or a boleto subscription is refused for it ("é necessário preencher o CPF ou CNPJ"); a card one is accepted. The plan page keeps asking it | Created a customer without a document, then a subscription by each method |
| An overdue card charge paid on its invoice (3) | Verified: listed as `OVERDUE` with its invoice; paid by card, it is confirmed and that card becomes the subscription's. Paying any of its charges with another card replaces the card. Another method on a card's invoice was not tried | Forced a card charge overdue, then paid it; paid a pending charge with a second test card |
| Cancelling at the period's end (4) | Verified: `endDate` is accepted and the subscription stays `ACTIVE` (not `EXPIRED` early); `endDate: null` clears it; the method and `nextDueDate` stay. What Asaas does once the end passes was not watched: the template's period-end job reads it then | Set and cleared an end through the API and through the adapter |
| A refused card tried again (5) | Not verifiable: the documented refusal card (`5184 0197 4037 3151`) was approved | Paid a first charge with it |
| Charges created ahead (6) | Partly: only the first charge exists at creation, later ones come from Asaas's daily run (40 days ahead by default, a dashboard setting) | Watched a new subscription's charges |
| `PAYMENT_CONFIRMED` for a boleto (7) | The sandbox's confirmation makes a boleto `RECEIVED` at once, with today's payment and credit dates; both count as paid | Confirmed a boleto |
| Fees (8) | Verified on this account: Pix and boleto R$ 0.99 each, card 1.99% + R$ 0.49 (R$ 47.54 net of R$ 49.00); the card's rate after three months is not shown | Read `netValue` after each payment |
| A one-off charge beside the subscription (9) | Verified for card, Pix and boleto; `daysAfterDueDateToRegistrationCancellation: 0` accepted on a boleto | Created one of each for a customer with live subscriptions |
| A new value on a charge already created (10, ADR 0067) | `updatePendingPayments` works for Pix and card but answers 500 on a boleto subscription; the subscription's value and then each pending charge's work for all three, which the adapter does (ADR 0070) | Changed the value of a subscription of each method with its next charge created |
| The R$ 5.00 minimum (11) | Verified for card, Pix and boleto: R$ 4.99 is refused | Created charges of R$ 5.00 and R$ 4.99 by each method |
| `externalReference` on what the adapter creates | Verified: the subscription and each of its charges carry it | Read them |
| `callback.successUrl` | Refused until the account has a site registered ("Cadastre um site em Minha Conta na aba Informações"); the adapter then creates the subscription or the charge without it. With a site registered, not verified (the owner's setting), nor whether the URL must be on that site | Created a subscription with and without it |
| An API subscription's first charge exists at once | Verified for card and Pix (due today) and boleto (in three days), each with an invoice | Created one of each |
| A deleted subscription | Read back as `deleted: true`, `INACTIVE`, not 404; its pending charges are deleted with it | Deleted one, read it and its charge |
| Deleting a boleto right after it is created | Answers 500 for a few seconds when its registration ends at its due date, then works | Deleted one at once and 15 s later |
| The job's reads, end to end | Verified: `subscription` read an active card subscription, a received boleto, an overdue card charge paid late, an unpaid Pix (`pending`), a deleted one (`cancelled`) and an unknown id (`null`), with the right periods; `payment` and `paymentPage` answered accordingly | Ran the adapter against the sandbox |
| A Checkout's `link`, items without `imageBase64`, `GET /payments?checkoutSession=` | No longer used (ADR 0070); a Checkout without a customer did answer with `link`, without an image | Created one |

## Set up once per product

- An uptime monitor (any free one) on `<web origin>/api/health` every 5 to 10 minutes, alerting on a
  status other than 200. Each check wakes the database: a shorter interval spends its free compute.
  It also keeps a sleeping container awake, which is what makes a delayed job run on time there.
- Notifications for a failed `Deploy`, `Audit` or `Purge` workflow in GitHub (on by default for the person who
  triggered the run).
- If the host's log retention is too short, a log drain to a log service; the lines are already JSON.
- The API and the database in the same region. A signed-in request makes at least two sequential
  database round trips (the session, then the membership with its roles and the organization's
  subscription, in one statement: [ADR 0063](adr/0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md)), and a tenant route then
  opens a transaction for its own work (`begin`, the statement that sets the tenant, the query,
  `commit`: [ADR 0055](adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md)), so each millisecond between them counts about six times on every
  tenant route. A write limited by the plan (creating or restoring a customer) counts first, one
  more statement in its transaction while the plan has a limit: eight round trips instead of seven.
  A public route makes two before its own work: the rate-limit counter, then the slug.

## When something breaks

| Symptom | First look |
| --- | --- |
| `/api/health` answers 503 | The database: Neon's status page and the project's compute; the API log's `idle database connection lost` |
| Calls answer 503 `service_unavailable` after up to about 25 s | API log: `dependency unavailable` and its `reason`. `timeout exceeded when trying to connect` means every connection was busy (a slow query holding them, or more traffic than five connections serve); `Query read timeout`, a code `57014` or a connection error point at the database: `/api/health`, then the provider's status and the project's compute. The API recovers on its own once the database answers; a restart does not help |
| A deploy fails in its migrations with `permission denied to create role` | Migration `0009_tenant_row_security` creates the role `app_tenant` ([ADR 0055](adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md)), and the database user of `DATABASE_URL` lacks `CREATEROLE` (Neon's and most hosts' default users have it). As the host's administrator, run `create role app_tenant nologin; grant app_tenant to "<that user>" with admin option;`, then redeploy: the migration finds the role and carries on |
| A tenant route answers 500 with `permission denied for table …` or `new row violates row-level security policy` in the log | The first: the table's migration lacks its three lines (policy and grant to `app_tenant`), see [using-the-template.md](using-the-template.md) step 5.3. The second: a use case passed one organization to `run` and wrote a row of another |
| The `Purge` workflow fails, or stopped running | Its log: `purge failed` with the error, or `Invalid environment: DATABASE_URL`. A runner that cannot connect means the database refuses GitHub's addresses: allow them, or run `node dist/purge.js` from the API image on the host's cron. GitHub pauses a schedule after 60 days without activity: enable it again on the workflow's page. A missed day only lets rows wait |
| `/api/health` does not answer | Render: the service's events and log; a crash leaves a `fatal` line |
| Pages load, every call fails | Worker log: an exception there means the Worker cannot reach `API_ORIGIN`; a 403 from the API means `PROXY_SECRET` differs between the Worker and the API |
| Visitors of one place (an office, a shop's own Wi-Fi) say a public page tells them to wait | They share one address and passed a limit: `rate limited` lines with that `limit`, and the address's row in [Public routes and rate limits](#public-routes-and-rate-limits). Delete the row to let them through now; raise the limit in `publicLimits` if it is too low for the product |
| Every visitor is told to wait, on every public page | The `…:unknown` counter is growing: requests reach the API with no `X-Client-IP`, so they all share one count. The Worker sets it from `CF-Connecting-IP` ([ADR 0022](adr/0022-accept-api-requests-only-from-the-web-worker.md)); on another proxy, set the header to the client's address there |
| A tenant's list fills with customers nobody knows | [Public routes and rate limits](#public-routes-and-rate-limits): the visitor-made rows per organization, and `rate limited` lines. From few addresses, the limit is holding and can be lowered; from many, put the host's rate limiting or a CAPTCHA in front of `/api/public/` |
| Members of one organization are refused every change with `subscription_read_only`, or a create with `plan_limit_reached` | Expected while its trial is over, its payment is past the grace period, or its plan has ended, or once it holds as many active customers as its plan allows ([ADR 0063](adr/0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md)). Its state: `select o.slug, o."createdAt", s.* from auth.organization o left join subscription s on s.organization_id = o.id where o.slug = '<slug>'`; no row means a trial of 14 days from `createdAt`. Nothing is deleted, and reads and deletions still work |
| An owner paid, and the organization is still on trial, past due or on its old plan | [Billing and the provider's webhook](#billing-and-the-providers-webhook): the notice in `webhook_event`, its job's state, then the subscription row. No notice: the provider has not sent it (a boleto takes up to three business days to clear) or its queue stopped. A failed job: put it back. A notice ignored as `unknown customer`: the customer was created by hand at the provider, or belongs to a deleted organization |
| `webhook refused` lines in the log | `reason: token does not match` from the provider's own addresses means its webhook secret differs from the API's: set the same value on both. From elsewhere, someone is probing the route: the refusal costs one hash and touches no table |
| `billing duplicate subscription` or `billing reference names another organization` at error | Two live subscriptions for one organization (a retried checkout at a provider without idempotency keys): the job ended the one the row does not hold; refund it from the provider's dashboard if it was charged. A reference to another organization means a subscription was edited at the provider: nothing was applied; correct it there |
| `job failed` in the log, or something that should have happened later did not | [Background jobs](#background-jobs): the failed rows and their `last_error`; fix the cause, then put them back |
| Jobs wait and nothing runs them | No `job queue working` line after the last start means no worker runs: `JOB_WORKER=off` on the API with no worker process beside it, or the worker process is down (its log, `service: worker`). `job poll failed` means the database is out of reach. A delayed job that ran late on a free tier waited for the container to wake |
| Emails do not arrive | API log (or the worker's): `job attempt failed` or `job failed` with `kind: identity.send-email`, and `err` with the provider's status and error code; the failed rows in [Background jobs](#background-jobs). No such line and no `job done` for the kind means no worker runs (the row above). A refusal from Resend names the cause: the key, or the sender domain in Resend (until it is verified, only the provider account's own address receives) |
| The deploy fails at the smoke test | The step's output: which check failed, and the `release` that answered |
| The first request after a quiet time takes about a minute | Expected on free tiers: Render and Neon wake up; the web says so after 5 s ([ADR 0041](adr/0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)). Meanwhile Render answers the Worker 429 with `X-Render-Routing: hibernate-…`, and the Worker asks again for up to 80 s ([ADR 0062](adr/0062-wait-in-the-worker-while-the-host-wakes-the-api.md)) |
| After a quiet time, the app says it could not check the sign-in | The wake took longer than the Worker's 80 s, or Render says it is waking in another way: in the browser's network tab, the failed call's `X-Render-Routing`. Opening the API's address in a browser wakes it; the uptime monitor of [Set up once per product](#set-up-once-per-product) keeps it awake |

**Roll back** by reverting the commit on `main`: CI and the deploy run again. Faster, while that
runs: deploy the previous image (`ghcr.io/<owner>/<repo>-api:<sha>`) from Render's dashboard, and
`wrangler rollback` for the web. The next deploy from `main` replaces both. Migrations only move
forward, so a rollback past a migration needs a new migration that undoes it.
