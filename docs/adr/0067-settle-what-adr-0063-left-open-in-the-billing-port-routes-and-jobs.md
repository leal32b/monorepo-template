# 0067. Settle what ADR 0063 left open in the billing port, routes and jobs

- Status: accepted
- Date: 2026-11-13

Amends [ADR 0063](0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md)
in one place: a downgrade sets the provider's price when it is scheduled, not at the renewal. Adds
to its port what the first provider of
[ADR 0064](0064-start-billing-on-asaas-because-stripe-cannot-charge-recurring-pix-in-brazil.md) needs,
and names the routes, the audit actions and the configuration ADR 0063 left to the build.

## Context and problem statement

ADR 0063 designed the billing port, the one open checkout per organization, the webhook route, the
sync job and the cancellation on deletion. Building them (P0-6, slice 1b) met questions it does not
answer, and one place where following it would charge the wrong price:

- Asaas opens a different page for a card (its Checkout, recurring) than for a Pix or a boleto (a
  subscription created by its API, paid on the charge's invoice), and boleto never goes through its
  Checkout (ADR 0064, "The adapter, in the template's words"). The port's `startCheckout` and
  `startPayment` take no payment method, so the adapter cannot tell which to open.
- "Cancel the upgrade", and the sync that drops a payment still open when its period ended, must stop
  the provider's page from taking money later. The port has no call that withdraws a checkout.
- ADR 0063 names one route, `POST …/billing/checkout`. The plan page also reads a version, the
  provider's reference and the provider's minimum, schedules a downgrade, cancels, resumes, drops a
  checkout and asks for the page of what is overdue.
- ADR 0063 says the sync calls `changePlan` at the renewal and then moves `next_plan` into `plan`.
  The renewal's charge already exists by then: Stripe creates the invoice at the period's end, and
  Asaas creates each charge days ahead (ADR 0064, sandbox point 6). Changing the price at the renewal
  would charge the month after a downgrade at the old, higher price.
- Every change of the row records an audit entry, and two changes have no action among the twelve:
  a first checkout dropped unpaid, and a period renewed on time.
- How the fake is told apart from a real provider in `pnpm dev` and in the end-to-end suite, what
  its commands carry, and what deleting an organization does while its deletion may still fail.

## Decision drivers

- The Asaas adapter (slice 3) fits the port without changing it, nor the routes or the web.
- Entitlements follow money, and money follows the plan: no charge at a price the owner did not
  choose.
- Every change of the row has one audit entry with an action the web can say.
- Nothing local changes when the provider refuses or is out of reach.
- No page left open at the provider can take money the row does not expect.
- ADR 0063's design stands wherever it answers.

## Considered options

For the payment method:

1. A `method` (`card`, `pix`, `boleto`) on `startCheckout` and `startPayment`, chosen by the owner.
2. No method: the adapter always opens one kind of page.

For withdrawing an open checkout:

a. `cancelCheckout(checkoutId)` on the port.
b. Let the page expire at the provider (30 minutes on Asaas's Checkout).

For a downgrade's price:

i. `changePlan` when the downgrade is scheduled, and again with the current plan when it is withdrawn.
ii. `changePlan` at the renewal, as ADR 0063 wrote.

## Decision outcome

Chosen options: 1, a and i, because a boleto cannot go through Asaas's Checkout, a page left to
expire can still be paid for half an hour after the owner said no, and a price changed at the
renewal is changed after the renewal's charge exists.

### The port, as built

`BillingProvider` (`#libs/ports/billing-provider.port`) is ADR 0063's, with these additions:

| Addition | Why |
| --- | --- |
| `method: PaymentMethod` on `startCheckout` and `startPayment` (`paymentMethods` in `@repo/contracts`: `card`, `pix`, `boleto`) | The adapter opens Asaas's Checkout for a card, a subscription or a charge by the API for a Pix or a boleto (ADR 0064) |
| `cancelCheckout(checkoutId)` | Withdraws an open page, and whatever it created at the provider that is not paid (Asaas: a pending subscription or charge). It does nothing to one expired or paid |
| `payment(id)` answers `expired` for an id the provider does not know; `subscription(id)` answers `null` | A row that outlived the provider's memory (the fake after a restart) heals instead of failing every retry |
| `BillingProviderUnavailableException`, an `UnavailableException` | Every call that cannot reach the provider, or that it refuses, answers `503 service_unavailable` like a database out of reach; nothing local has changed |
| `readWebhook` comes from `WebhookReader` (`#libs/ports/webhook-reader.port`), with `WebhookRefused` and `name` | `webhookRoute` (`#libs/webhooks/webhook-route`) serves any provider, and lives in `libs` |
| `NoticeSource.listen(deliver)`, optional | The fake's own completions in `pnpm dev` reach the same inbox as the webhook route |

The Asaas adapter may still need the payer's CPF or CNPJ to create a customer for a Pix or a boleto
subscription (ADR 0064, sandbox point 2). When the sandbox says so, `startCheckout` gains an optional
`payer`, and the checkout's input with it: one field added, nothing reshaped.

### A downgrade changes the provider's price when it is scheduled

`PUT …/billing/plan` with a cheaper plan calls `changePlan(subscription, cheaper)` and sets
`next_plan`; choosing the current plan again calls `changePlan(subscription, current)` and clears it.
The plan itself, and so the entitlements, change when the notice of the renewal arrives (the sync
moves `next_plan` into `plan` once the provider's period starts at or after the row's
`paid_through`), so the organization keeps what it paid for until then. Nothing else of ADR 0063's
"Changing plan" changes. Asaas's sandbox point 10 (whether a new value changes a charge already
created) decides whether its adapter must also update that charge.

### The routes

All under `/api/organizations/:organizationId/billing`, through `tenantRoutes` with
`{ billing: ['manage'] }` and `duringReadOnly`, so only the owner reaches them and paying works while
the organization is read only. Each change carries the version read (`409 subscription_changed`
otherwise; an organization with no row is version 0) and records its audit entry with the owner as
the actor.

| Route | Input | Answer |
| --- | --- | --- |
| `GET` | | `billingSchema`: the subscription as the membership read says it, `version`, `reference` (the provider's subscription id), `checkoutUrl` and `checkoutExpiresAt` while the open checkout takes a payment, `minimumCharge`. It never calls the provider |
| `POST /checkout` | `{ plan, method, version, returnTo }` | `{ url }`, the provider's page, or `{ url: null }` when the plan changed at once (an upgrade below the minimum). A second request for the same plan gets the same page; another plan is `409 checkout_open` |
| `DELETE /checkout` | | 204. The page is withdrawn and the checkout dropped; a payment already made is `409 checkout_paid` |
| `PUT /plan` | `{ plan, version }` | 204. A cheaper plan from the period's end, or the current one to withdraw it |
| `POST /cancel`, `POST /resume` | `{ version }` | 204. The end at the period's end, or its withdrawal, as the provider then reports it |
| `GET /payment-page` | | `{ url }`: the provider's page for what is overdue, or `null` |

`returnTo` is a path of the web app, never a whole URL; the API joins it to `WEB_ORIGIN` and adds
`?checkout=returned` or `?checkout=cancelled`, so a checkout cannot send the owner to another site.
The refusals are seven 409 codes in `billingProblems`: `subscription_changed`, `checkout_open`,
`checkout_paid`, `subscription_not_active`, `cancellation_scheduled`, `payment_overdue` and
`plan_change_not_allowed` (a dearer plan goes through the checkout, a cheaper one through the plan).

**What the checkout is for.** A subscription at the plan's full price on trial, after an end, while
past due, and for the current plan while active. The last two replace the subscription the row
holds: once the new one is active, the sync ends the old one at the provider. That is "Pay now" when
the provider has no page for what is overdue, and "Change payment" for Asaas, which has no portal
(ADR 0064). An upgrade is a dearer plan while active and not set to end.

### Audit entries

`checkout-abandoned` (a first checkout dropped unpaid) and `renewed` (a period paid on time) join
ADR 0063's twelve. The claim of a checkout, and its release when the provider fails, record nothing:
the entry (`checkout-started` or `upgrade-started`) is written when the provider's page is stored,
so the trail never shows a checkout that never opened. A notice's sync records one entry for what it
changed, with every field it changed, and the most telling action: what the job completed or dropped,
otherwise the end, a payment failed, a payment recovered, a plan changed, a scheduled end or its
withdrawal, a renewal.

### The fake and its configuration

- The fake is the adapter while no provider's key is set. `FAKE_BILLING_TOKEN` (16 characters at
  least) is what its commands carry in `fake-billing-token`; unset, every command is refused. Env
  validation refuses the fake when `WEB_ORIGIN` is https and names `ASAAS_API_KEY`, the key that
  selects the first real adapter: until slice 3, no https environment starts.
- A command names the organization (`organizationId`), not the provider's ids, so the end-to-end
  suite needs nothing but the organization it created. It may name its `eventId`, and a repeated
  event id gets the same notice back, carried out once.
- `main.ts` turns `autoComplete` on (three seconds), since the fake only runs there in development;
  `main.e2e.ts` turns it off.
- The fake keeps its state in the API's process. A worker in a process of its own holds another,
  empty fake, so with the fake the jobs run in the API (`JOB_WORKER` on, the default).

### Deleting an organization

Identity gains `OrganizationDeletionListener` (`#modules/identity/index`), told of the organizations
about to go, by their owner or with the account of their only member; identity imports nothing of
billing. Billing's listener reads each row while it exists and enqueues `billing.cancel-at-provider`
a minute later. The job cancels at once when the row is gone; while it exists, the deletion has not
happened, and the job tries again; on its fifth attempt it leaves the subscription, with a warning.

### Where the rules live

The rules are pure functions of the row (`modules/billing/subscription.ts`) at the module's root, not
in `domain/`: they read the catalogue and `prorateUpgrade` from `@repo/contracts`, which the domain
folder may not import (`api-domain-is-pure`).

### The minimize-support report

- External dependency (the webhook down, or the provider): a notice the API could not take answers
  503 or nothing, and the provider resends it; one lost for good is healed by the next, since the job
  reads the whole state (recover). The job retries for about 43 minutes, then `job failed`; the
  operator puts it back or replays the notice with its ids ([operations](../operations.md)). A
  provider out of reach during a request is 503 with nothing changed. In development, a completion
  the inbox could not take is sent again with `checkout.complete` and its event id.
- State (a checkout abandoned): expired or cancelled at the provider, the sync drops it, nothing was
  charged, and "Choose" works again (recover). "Cancel the upgrade" withdraws the page so it cannot
  take money later (prevent); a payment already made is not dropped, and the answer says the plan
  changes when it is confirmed (self-diagnosis). A page that lapsed is withdrawn before a new one
  opens, and an upgrade's page still open when its period ended is withdrawn by the sync (prevent).
  A claim left by a process that died lapses after 10 minutes (recover).
- Concurrency: a double click or a second tab gets the same page back, another plan is refused with
  its reason (prevent); a stale screen's change is `409 subscription_changed`, and the screen reads
  again.
- Account and billing (a payment failed): full access for the grace period, then read only, never a
  deletion; paying works while read only, through the provider's page or a new checkout (recover);
  the recovery restores everything at once. The trail shows the failure and the recovery by the
  system (self-diagnosis), on a plan with the activity log.
- Permission: every billing route is the owner's; another member gets `403 permission_denied`, and
  the screens (slice 2) say the owner manages the plan.
- Left out: billing emails (P1-6), refunds (the provider's dashboard), and a page for the operator
  that lists notices received (the log and the SQL of operations serve).

### Consequences

- Good: the Asaas adapter implements the port as it is, for card, Pix and boleto alike.
- Good: the month after a downgrade is charged at the plan chosen, on every provider.
- Good: no page the owner left can take money the row does not expect.
- Good: every change of the row, the provider's included, has its audit entry and its words.
- Good: the end-to-end suite drives the fake knowing only the organization.
- Bad: the plan page asks the owner how to pay before the provider's page opens, a choice ADR 0063
  did not have.
- Bad: a downgrade withdrawn after the provider created the next charge may leave that charge at the
  lower price until the adapter updates it (ADR 0064, point 10).
- Bad: no https environment starts until a real adapter exists.
- Bad: the cancellation of a deleted organization's subscription waits a minute, and gives up after
  about 43 minutes if the organization is still there.

## Revisit when

The Asaas sandbox answers ADR 0064's points 1, 2 and 10 (Pix through Checkout, the payer's document,
a new value on a charge already created). A second provider whose pages do not differ by method, or
that offers a portal. A product that needs the trail to show the claim of a checkout, or a renewal
per line of an invoice.
