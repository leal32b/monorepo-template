# 0063. Subscribe each organization through a billing port, and check entitlements, not plans

- Status: accepted; its route checks land in the tenant route helper of [0065](0065-declare-a-modules-tenant-routes-through-one-helper-without-controller-classes.md)
- Date: 2026-11-12

Amends [ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md) (the tenant
guard's membership read carries the organization's subscription, and the guard refuses a product
write while the organization is read only). The first provider is chosen in
[ADR 0064](0064-start-billing-on-asaas-because-stripe-cannot-charge-recurring-pix-in-brazil.md).

## Context and problem statement

An organization pays nothing and is limited by nothing but the ceilings of ADR 0033
(`organizationLimits`: organizations per user, members, custom roles, invitations a minute), which
are the same constants for everyone. There are no plans, no trials and no payment webhooks. A SaaS
started from the template needs them before its first paying customer, and they are expensive to
retrofit: every module would have to learn where a limit comes from, and every screen what a late
payment means.

The worked example makes it sharper. A barbershop and a pilates studio are one product (the product
readiness plan, "Beyond the template"): what differs is a capability, such as group sessions or
commissions, and two plans differ in the same way. Code that asks "is this the pro plan" or "is this
a pilates studio" turns every new plan or kind of business into a hunt through the modules.

This record answers, for any provider:

- How does the API talk to a payment provider, and how do tests and the end-to-end suite run
  without one?
- Where do plans, their entitlements and an organization's subscription live?
- How does code ask what an organization may do, at what cost per request, and how does the web
  learn the same?
- Which states can a subscription be in, what does each screen say, and what does a failed payment
  do?
- Who manages the subscription, and what does deleting an organization do to it?
- How does a provider's notice reach the API, authentically and once?
- What stops a retried request from paying twice?

## Decision drivers

- Changing provider is one adapter and its environment, as for email
  ([ADR 0021](0021-send-email-through-a-provider-neutral-port.md)).
- Tests and the end-to-end suite run with no provider account and no network
  ([ADR 0045](0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md)), and can
  make a payment fail and recover.
- A module asks what an organization may do, never which plan it is on or what kind of business it
  is.
- No extra database round trip per tenant request. A signed-in tenant read already makes six
  ([ADR 0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md)).
- A failed payment never deletes data, and never locks a member out of reading their own records.
- The template never draws a payment form: card data is typed only on the provider's pages.
- A provider's notice may be forged, repeated, late or out of order. None of these may change an
  organization's state wrongly.
- Spending the organization's money is the owner's decision.
- Every change of a subscription leaves an audit entry
  ([ADR 0061](0061-keep-one-append-only-audit-trail-per-organization.md)).
- Nothing depends on one host.

## Considered options

Where plans and entitlements live:

1. Plans and entitlements in code (`@repo/contracts`), and the subscription's state in a table of
   ours.
2. Plans in a table that an operator edits.
3. Plans and entitlements at the provider (its products, prices and feature lists), read on demand
   or mirrored.

What code checks:

a. Entitlements: named capabilities and limits.
b. The plan's name.

Where the check gets the subscription:

i. From the membership read that the tenant guard already makes, with the subscription joined in.
ii. From a query of its own on each request.
iii. From a cache in the process.

How a provider's notice is processed:

A. Authenticated, recorded by event id and enqueued in one transaction; the job reads the
   provider's current state.
B. Authenticated, then applied from the notice's own payload, inside the request.
C. As A, but the job applies the notice's payload.

How a retried upgrade is kept from paying twice:

x. One open checkout per organization, held on the subscription row, plus the provider's
   idempotency key where it has one.
y. P2-1 now: an `Idempotency-Key` header per form submission, stored with its answer.

## Decision outcome

Chosen options: 1, a, i, A and x.

### The billing port

Port `BillingProvider` (`#libs/ports/billing-provider.port`), beside `EmailSender`. It speaks the
template's words, never a provider's:

| Method | What it does |
| --- | --- |
| `startCheckout({ organizationId, plan, customerId?, returnUrl, cancelUrl })` | Opens the provider's hosted page where the owner subscribes to `plan`, at the catalogue's price and interval. It reuses the provider's customer when the row holds one, and returns `{ checkoutId, url, customerId, expiresAt }`. Money moves on that page, never in our request. |
| `startPayment({ organizationId, customerId, amount, description, returnUrl, cancelUrl })` | Opens a hosted page for one payment of `amount` (an upgrade's difference, see "Changing plan"), for the customer who holds the subscription. Returns `{ checkoutId, url, expiresAt }`. |
| `payment(checkoutId)` | The state of that one payment: `open`, `paid` or `expired`. |
| `minimumCharge` | The smallest amount the provider accepts for one charge, as money. |
| `paymentPage(subscriptionId)` | A hosted page where the payer pays what is overdue or changes how they pay, or `null` when the provider has none. The screen then offers a new checkout. |
| `changePlan(subscriptionId, plan)` | Sets the price of the next charges. Charges nothing now. |
| `cancel(subscriptionId, { atPeriodEnd })`, `resume(subscriptionId)` | Ends the subscription now or when the paid period ends, or withdraws a scheduled end. |
| `subscription(subscriptionId)` | The provider's current state, as `ProviderSubscription`: `subscriptionId`, `customerId`, `reference` (the organization id we sent), `status` (`pending`, `active`, `past_due` or `cancelled`), `periodStart`, `paidThrough`, `overdueSince`, `cancelAtPeriodEnd` and `price`. |
| `readWebhook(rawBody, headers)` | Authenticates a notice and returns `{ eventId, subscriptionId?, checkoutId?, customerId? }`. It returns `ignored` for a kind the template does not use, and throws `WebhookRefused` when authentication fails. |

The adapters live in `#libs/adapters/<provider>-billing-provider.ts` and call the provider with
`fetch`, without its SDK, as the Resend adapter does. A product that changes provider replaces one
file and its variables. Configuration picks the adapter at start-up by the key that is set, as it
picks email's: a provider's key means that provider; no key means the fake. Env validation refuses
the fake when the web origin is `https`, as it refuses the log email adapter.

**The fake** (`#libs/adapters/fake-billing-provider`) keeps checkouts and subscriptions in memory,
with the API's clock. Tests drive it through its methods. The end-to-end suite and a developer drive
it through its webhook route. It can be told to:

- accept a checkout (`checkout.complete`): the subscription is active, paid for a month, or an
  upgrade's payment is paid;
- abandon a checkout (`checkout.abandon`): nothing is charged;
- fail a payment (`payment.fail`): past due from now;
- recover (`payment.recover`): active again, paid for a month from now;
- renew (`period.renew`): a renewal paid on time;
- cancel (`subscription.cancel`);
- fail its next call, in tests only, to show what an outage of the provider does.

A command is a JSON body sent to `POST /api/webhooks/fake` with the header `fake-billing-token`. The
fake's `readWebhook` compares the token in constant time, changes its own state, and returns the
notice a provider would have sent. The notice has a fresh event id, or the id the command names, so
a test can send a repeat. Everything after that point is the real path: the event record, the job
and the sync. In `pnpm dev` the fake completes a checkout by itself after a few seconds
(`autoComplete`), so the screens can be tried by hand. The end-to-end suite turns that off and sends
the commands. `startCheckout` returns the return URL itself, so there is no fake payment page to
build.

### Plans and entitlements in code

`@repo/contracts` gains `billing.ts`. The shape:

```ts
export const capabilities = ['activity-log'] as const
export const limits = ['customers.max'] as const

export const plans = {
  basic: {
    price: { amount: 4900, currency: 'BRL' },
    interval: 'month',
    entitlements: { capabilities: [], limits: { 'customers.max': 100 } }
  },
  pro: {
    price: { amount: 9900, currency: 'BRL' },
    interval: 'month',
    entitlements: { capabilities: ['activity-log'], limits: { 'customers.max': null } }
  }
} as const satisfies Record<string, Plan>

export const trial = { days: 14, entitlements: plans.pro.entitlements }
export const gracePeriod = { days: 14 }
```

- A **capability** is something an organization can or cannot do: `activity-log` here, and
  `group-sessions`, `commissions` or `online-booking` in a product. It is lowercase words with
  hyphens, named for what it enables, never for a plan or a kind of business.
- A **limit** is a number, named `<resource>.max`. `null` means no limit.
- A **price** is money in minor units with its currency
  ([ADR 0053](0053-keep-time-zone-and-currency-on-the-organization-and-money-in-minor-units.md)). The
  SaaS charges in the currency of its plans (BRL here), whatever currency the organization keeps for
  its own business.
- **The catalogue is code**, read by both apps. The web draws the plans from the contract with no
  request. A change of price or limit is a deploy, reviewed like any other code. The adapter sends
  the price with each checkout, so nothing has to be created in the provider's dashboard to match
  the catalogue.
- Names, prices and numbers are placeholders for the reference module. A product writes its own
  catalogue in this file.

**What the template ships.** One limit, `customers.max`, enforced on the reference module. One
capability, `activity-log`, on the screen of ADR 0061: the trail is recorded on every plan, and
reading it needs `pro`. Both exist to show each kind end to end, and a product removes or replaces
them.

**Kinds of business use the same keys.** A product that serves several kinds keeps the kind as a
setting of the organization (ADR 0053 keeps the time zone that way), with the capabilities each kind
uses. An organization then holds a capability when its plan grants it and its kind uses it. That
intersection is the one place that names the kind. Modules ask `entitlement(member,
'group-sessions')`, never whether the kind is pilates, so a new kind is one line in a table, and
turning a module on for a kind adds its capability to that line.

**`organizationLimits` stays.** Its numbers are ceilings against abuse that hold on every plan,
enforced inside Better Auth. A product that sells seats adds `members.max` as an entitlement,
checked in `beforeCreateInvitation`, and keeps the plugin's ceiling as the outer bound.

### The subscription in the database

Migration `0013_subscription.sql` creates a tenant table under ADR 0055:

| Column | What it holds |
| --- | --- |
| `organization_id` | Primary key, `references auth."organization" on delete cascade`: one row per organization. |
| `status` | `trialing`, `active`, `past_due` or `cancelled`, held by a check. |
| `plan` | The plan paid for, a key of `plans`. Null until a checkout is confirmed. |
| `next_plan` | A downgrade scheduled for `paid_through`, or null. |
| `trial_ends_at` | When the trial ends or ended. |
| `period_starts_at`, `paid_through` | The start and the end of the period paid for, from the provider. |
| `past_due_since` | The due date of the oldest unpaid charge, from the provider. Null when nothing is overdue. |
| `cancel_at_period_end` | A cancellation is scheduled for `paid_through`. |
| `provider`, `provider_customer_id`, `provider_subscription_id` | Who holds the customer, and its ids there. Each id is unique with `provider`. |
| `checkout_kind`, `checkout_plan`, `checkout_amount`, `checkout_id`, `checkout_url`, `checkout_expires_at` | The checkout that is open, if any: a first subscription or an upgrade's payment, for which plan, and for how much (see "A retried upgrade does not pay twice"). |
| `version`, `created_at`, `updated_at` | The version of [ADR 0048](0048-refuse-a-stale-save-with-a-version-per-record.md), and times. |

- **No row means the trial.** An organization has no row until its owner first opens a checkout.
  Until then it is on trial, and the trial ends `trial.days` after the organization was created
  (`auth.organization."createdAt"`, read by the same query). So creating an organization stays one
  request to Better Auth, with no hook of ours that could fail after the organization exists, and
  no organization is ever without a state. The migration inserts a row for each organization that
  exists at that moment, with its trial starting on the migration's day, so a deployed template
  does not put its existing organizations straight into read only.
- **The plan is ours; the payment is the provider's.** `plan` changes only through the billing use
  cases: a checkout or an upgrade's payment that the provider confirmed, a free upgrade below the
  provider's minimum, or a downgrade whose period ended. `status`, `period_starts_at`,
  `paid_through`, `past_due_since` and `cancel_at_period_end` come only from the provider's state.
  No request body can set the plan, and the provider cannot put an organization on a plan nobody
  chose.
- **Row-level security** uses the three lines of ADR 0055, without a `delete` grant: the row goes
  only with its organization. Its writes happen in the billing module's unit of work, with their
  audit entry, and `lint:deps` keeps its repository from being bound anywhere else.

Table `webhook_event` belongs to the platform. It has `source`, `event_id` and `received_at`, with
the primary key `(source, event_id)`. It has no organization and no grant to `app_tenant`. The daily
purge ([ADR 0050](0050-purge-expired-rows-daily-from-a-job-of-its-own.md)) deletes rows older than 30
days. That is longer than either provider of ADR 0064 keeps resending a notice (Stripe three days,
Asaas fourteen).

### One check, on the read already made

Today a signed-in tenant request makes two round trips before its own work. The first reads the
session. The second reads the membership and the custom roles in one statement
(`OrganizationReader.memberOf`). The unit of work then sends `begin`, the tenant statement, the
query and `commit`. A read costs six round trips.

The membership statement gains two joins:

```sql
select m.role, /* the custom roles, as today */, o."createdAt",
       s.status, s.plan, s.next_plan, s.trial_ends_at, s.period_starts_at, s.paid_through,
       s.past_due_since, s.cancel_at_period_end, s.checkout_kind, s.checkout_plan, s.checkout_amount
from auth.member m
join auth."organization" o on o.id = m."organizationId"
left join subscription s on s.organization_id = m."organizationId"
where m."organizationId" = $1 and m."userId" = $2
```

It is still one statement. A tenant read stays at six round trips, a write stays where it was, and a
non-member still costs that single query and nothing more. The statement runs on the pool as the
tables' owner, as the membership read already does, since the tenant role cannot read `auth`. The
subscription row it reads is keyed by the organization whose member row matched, so it reads nothing
the guard would not hand the caller anyway.

`Member` gains `subscription` (status, plan, dates and `access`) and `entitlements`. Two pure
functions in `@repo/contracts`, beside `covers`, compute them from the row and the API's clock:
`accessOf(subscription, now)` and `entitlementsOf(subscription)`. Identity's adapter calls them, so
identity imports nothing from the billing module.

**The check.** `entitlement(member, key)`, in `@repo/contracts`, is the only way code reads an
entitlement. It returns `true` or `false` for a capability, and a number or `null` for a limit.
`#modules/billing/index` builds two guards on it:

- `requireEntitlement(member, 'activity-log')` refuses with `403 plan_required`.
- `assertWithinLimit(member, 'customers.max', count)` refuses with `403 plan_limit_reached`.

Both problems carry `entitlement` (the key), and the limit's also carries `limit` (the number). Both
are new optional members of the problem contract. A use case with a limit receives the number from
its controller, as it receives the `AuditActor`. It counts inside its own `run`, and asks the domain
whether one more fits, so the domain stays pure. The reference module counts active customers
(archived ones do not count), on create and on restore. That adds one statement to those two
transactions and nothing anywhere else. Two creates at the same instant can both pass the count and
leave the organization one over the limit. A limit is a commercial line, not a safety one, and
serializing every create of an organization costs more than one extra customer.

**Read only is enforced in one place.** `requireMember` refuses `POST`, `PUT` and `PATCH` with
`403 subscription_read_only` when the member's `access` is `read-only`, unless the route declares
that it serves billing (`requireMember(…, { duringReadOnly: true })`). No module can forget the
rule. `GET` and `DELETE` pass. Everything stays readable, and a record can still be deleted, because
a person's request to have their data erased does not wait for a payment. Managing the organization
through Better Auth (members, roles, settings, deletion) does not pass this guard and stays open, so
the owner can still delete the organization, hand it to another owner or remove someone.

**The public surface is not gated**
([ADR 0059](0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)). A visitor is
no party to the subscription, and a shop's clients should not meet its late payment. A product whose
public flow is a capability, such as online booking, joins the subscription into
`PublicOrganizations.bySlug` the same way, in one statement, and decides what a visitor sees.

**The web** gets the same data through the membership read it already makes for the frame.
`organizationMembershipSchema` gains `subscription` and `entitlements`, and the web calls the same
`entitlement` function from the contracts. `access` is computed with the API's clock, so a device
with a wrong clock cannot disagree with the API about the last day of a trial. What the web holds is
for drawing only; the API decides.

### The states

Four statuses are stored, in the template's words. What a member may do is derived (`accessOf`) from
the status, the dates and the clock, so time alone moves an organization into read only, with no job
that has to run on time.

| Status | Means | Access |
| --- | --- | --- |
| `trialing` | No plan paid for yet | Full until `trial_ends_at`, then read only until a plan is paid for |
| `active` | The provider says it is paid | Full. With a cancellation scheduled, read only from `paid_through` |
| `past_due` | A charge is unpaid since `past_due_since` | Full during the grace period, then read only |
| `cancelled` | Ended at the provider | Read only |

**The numbers.** The trial lasts **14 days and needs no card**: long enough for a shop to see two
weeks of its schedule in the product, short enough to decide within one. The grace period lasts
**14 days** from `past_due_since`. It spans the provider's own retries (Stripe's default is up to
eight attempts in two weeks), a boleto paid on its last day and confirmed by the bank days later, and
an owner who is away for a week. Both numbers are constants in `billing.ts`.

**A payment never deletes data.** No state of a subscription deletes records or members. Read only
is the floor, for as long as the organization exists, and paying again restores everything at once.
Only the owner deletes an organization (ADR 0033). A product that wants to delete organizations left
unpaid for a long time writes that policy, with notice to the owner, in an ADR of its own.

### Changing plan

**An upgrade charges the difference for the days left, and its entitlements follow the money.**
Choosing a dearer plan while `active` opens a one-off payment on the provider's hosted page
(`startPayment`), through the same one open checkout per organization. Its amount is computed in
integer minor units:

```text
difference   = new plan's price − current plan's price
daysInPeriod = whole days from period_starts_at to paid_through (rounded to the nearest day)
daysLeft     = whole days from now to paid_through, a part of a day counted as a whole one,
               at most daysInPeriod
amount       = floor(difference × daysLeft / daysInPeriod)
```

The division rounds down, so the payer is never charged more than the exact share, and at most one
centavo less. Days are spans of 24 hours between instants, with no time zone involved. From `basic`
(R$ 49.00) to `pro` (R$ 99.00) with 12 of 30 days left, the amount is 5 000 × 12 / 30 = 2 000, so
R$ 20.00. With 10 of 31 days left it is 50 000 / 31 = 1 612.9, so R$ 16.12. The function is
`prorateUpgrade` in `@repo/contracts`, so the plan page shows the amount before the owner chooses.
The API computes it again when it opens the payment, and its number is the one charged.

- **When the provider confirms the payment**, the sync job sets the subscription's price at the
  provider to the new plan's (`changePlan`, for the next charges). Then, in `run`, it sets `plan` and
  clears the checkout. The new entitlements apply from that moment, and from the next renewal the
  subscription costs the new plan's price. A card confirms in seconds, Pix in minutes and a boleto in
  up to three business days. Until then the organization keeps its current plan, so entitlements
  never run ahead of the money.
- **While the payment waits**, the plan page says "Upgrade to Pro: waiting for the payment of
  R$ 20.00. Pro starts as soon as it is confirmed: a card in seconds, Pix in minutes, a boleto in up
  to three business days.", with "Open the payment" while the provider's page is still valid, and
  "Cancel the upgrade". The frame shows nothing and members see nothing, because the organization
  works as before.
- **When the payment is abandoned**, because it expires or the owner cancels it, the checkout clears
  and nothing was charged. The page says "The upgrade to Pro was not paid. You are still on Basic,
  and nothing was charged.", and "Choose" works again. If the paid period ends with the payment still
  open, the sync cancels it at the provider, since its amount was for days that are gone. An owner
  who still wants Pro chooses it again, for the new period's days.
- **Below the provider's minimum, the upgrade is free.** A provider refuses a charge under its
  minimum; Asaas's help centre states R$ 5.00 a charge (ADR 0064). Each adapter declares its
  `minimumCharge`. When the amount is zero or below it, no payment is opened: the API calls
  `changePlan`, sets `plan` at once and records `plan-changed`. Before the owner confirms, the plan
  page says "Pro starts now. There is nothing to pay for the 2 days left; from 5 December it costs
  R$ 99.00 a month."
- **A downgrade takes effect when the paid period ends.** It sets `next_plan`, and the plan page says
  "Changes to Basic on 5 December", with "Keep Pro". At the renewal the sync calls `changePlan` and
  moves `next_plan` into `plan`. Nothing is refunded, and the organization keeps what it paid for
  until then. An upgrade clears a scheduled downgrade, and choosing the current plan again clears it
  too, at no charge.
- **No plan is used without being paid for.** An upgrade on day 1 pays the whole month's difference,
  and a downgrade on day 29 changes the plan only at the renewal. The one exception is below the
  provider's minimum: upgrading for free in the last two or three days and downgrading the same day
  gives those days of the higher plan, worth less than any charge the provider would take.
- **When an upgrade is allowed.** Only from `active`. On trial, choosing a plan is the first checkout,
  at the full price. While past due, "Pay now" comes first, and "Choose" carries the reason in its
  note. With a cancellation scheduled, "Keep the plan" comes first.
- **A downgrade deletes nothing.** Below what the organization already holds (300 customers on a plan
  of 100), creating more is refused until it is under the limit.

### What each screen says, and who sees it

The state shows in the frame, above every screen, in the one `Alert`. It is drawn from the
membership read the frame already makes, so it arrives with the frame and moves nothing afterwards.
Dates are written in the organization's time zone (ADR 0053). The sentences below are the meaning;
the web slice writes them in every language of the dictionaries.

| When | Owner | Other members |
| --- | --- | --- |
| Trial, more than 7 days left | Nothing in the frame. The plan page says "Trial: 12 days left, until 5 December." | Nothing |
| Trial, last 7 days | `info`: "Your trial ends on 5 December. Choose a plan to keep adding and changing records. Nothing is deleted." with "See plans" | From the last 3 days, `info`: "This organization's trial ends on 5 December. After that it is read only until its owner chooses a plan." |
| Trial ended | `warning`: "Your trial ended on 5 December. The organization is read only: everyone can view and delete, nobody can add or change. Choose a plan to edit again. Nothing was deleted." with "See plans" | `warning`: "This organization is read only since 5 December, until its owner chooses a plan. You can still view everything." |
| Active | Nothing. The plan page shows the plan, its price and "Paid until 5 January". | Nothing |
| Upgrade waiting for its payment | Nothing in the frame. The plan page says "Upgrade to Pro: waiting for the payment of R$ 20.00. Pro starts as soon as it is confirmed…" with "Open the payment" and "Cancel the upgrade". | Nothing |
| Upgrade not paid (expired or cancelled) | Nothing in the frame. The plan page says "The upgrade to Pro was not paid. You are still on Basic, and nothing was charged." | Nothing |
| Downgrade scheduled | Nothing in the frame. The plan page says "Changes to Basic on 5 January" with "Keep Pro". | Nothing |
| Cancellation scheduled | `info`: "Your plan ends on 5 January. After that the organization is read only." with "Keep the plan" | From the last 3 days, `info`: "This organization's plan ends on 5 January. After that it is read only." |
| Past due, within the grace period | `warning`: "We have not received the payment due on 3 November. Pay by 17 November to keep editing. Nothing is deleted." with "Pay now" | `info`: "This organization's payment is late. From 17 November it is read only until its owner pays." |
| Past due, grace period over | `warning`: "The organization is read only since 17 November because the payment due on 3 November was not received. Pay to edit again. Nothing was deleted." with "Pay now" | `warning`: "This organization is read only since 17 November, until its owner pays. You can still view everything." |
| Cancelled | `warning`: "Your plan ended on 5 January. The organization is read only. Choose a plan to edit again. Nothing was deleted." with "See plans" | `warning`: "This organization is read only since 5 January, until its owner chooses a plan. You can still view everything." |

While the organization is read only, an action that writes is drawn disabled, with the reason in its
row's note ("Read only until the owner pays"), so a member is told before they try instead of being
refused afterwards.

**The plan page**, `/:orgSlug/settings/billing` ("Plan and billing"), is for those who hold
`billing:manage`, and the menu shows it only to them. It has:

- the current state, in one sentence;
- the plans from the catalogue, with their prices and what each adds, and "Choose" for each. For a
  dearer plan, the choice says first what is paid now and from when the new price runs ("You pay
  R$ 20.00 now for the 12 days left; from 5 December, R$ 99.00 a month"), or that the change is free
  below the provider's minimum. For a cheaper one, it says the date the change takes effect;
- "Pay now" while a payment is overdue;
- "Change payment" when the provider has a page for it;
- "Cancel plan" in a `ConfirmForm` that says until when the plan stays paid, that nothing is
  deleted, and that it can be kept until then;
- the provider's reference for the subscription in small text, for a support request.

**Coming back from the provider**, after a first subscription or an upgrade's payment. The return URL
lands on the plan page with `?checkout=returned`. Until the provider's notice is applied, the page
says "Confirming your payment with the provider…"
and reads the membership again every 3 seconds, for up to a minute. Then it says "The provider has
not confirmed the payment yet. A boleto or Pix can take a while. This page shows it when it arrives,
and you can keep working." The cancel URL says "Payment not completed. Nothing was charged."

**A limit or a capability.**

- `plan_limit_reached`. To the owner: "Your plan allows 100 active customers. Choose a larger plan,
  or archive customers you no longer serve." with "See plans", or, while an upgrade waits for its
  payment, "The upgrade to Pro starts when its payment is confirmed." To other members: "This
  organization's plan allows 100 active customers. Archiving customers you no longer serve frees
  room; its owner can choose a larger plan." The refusal should be the exception (a second tab, a
  stale screen): once the list's total reaches the limit, the "New customer" action carries the same
  sentence in its row's note. When it does happen, the panel keeps what was typed.
- `plan_required` for `activity-log`. The Activity screen shows an `EmptyState`: "The activity log
  comes with the Pro plan. Activity is recorded on every plan and shows here once the plan includes
  it." It adds "See plans" for the owner, and "Its owner can change the plan." for others.
- `subscription_read_only`. The same sentence as the frame's, in the action's alert, should a stale
  screen send a write.

The status is 403, not 402. HTTP reserves 402 "Payment Required" for future use (RFC 9110), and the
web's error kinds go by status; the code says why.

**The `minimize-support` report** (failure, then response):

- Input: nothing is typed. A plan is picked from the catalogue (eliminate).
- State: an abandoned or expired checkout leads to "Nothing was charged", and "Choose" opens a new
  one (recover). An upgrade not paid leaves the organization on its plan, with the same words. An
  upgrade's payment still open when the period ends is cancelled at the provider, so a payment for
  days already gone cannot be made. An organization deleted while a payment is pending has its
  provider subscription cancelled (below), and later notices about it are ignored.
- Permission: wherever the plan matters, a member who cannot manage it reads that its owner does
  (self-diagnosis).
- Concurrency and timing: a double click or a second tab gets the same open checkout back (prevent).
  A late notice makes the page wait and say so, then lets the owner carry on (detect early,
  self-diagnosis). Two creates past a limit at the same instant are accepted (above).
- External dependency: when the provider is down, the answer is `503`, "try again in a moment", and
  nothing has changed locally, because the provider is called before anything is written. A delayed
  or lost notice is healed by the next one, since each notice makes the API read the whole state
  again (recover). The operator sees `job failed`, and a paused notice queue at the provider
  ([operations.md](../operations.md)).
- Understanding: every banner says what is happening, what happens next and when, in the
  organization's time zone, and that nothing is deleted. Before an upgrade, the owner reads what is
  paid now and the price from the next renewal; before a downgrade, the date it takes effect
  (prevent a surprise charge or a surprise loss). While an upgrade's payment waits, the page says how
  long each method takes (self-diagnosis).
- Irreversibility: a cancellation takes effect at the end of the paid period and can be withdrawn
  until then (recover). Deleting the organization says, in its confirmation, that the plan is
  cancelled with it.
- Account and billing: a declined card or an unpaid boleto gets the grace period and "Pay now", to
  the provider's page. A limit gets its note before the action, and archiving as a way out. An
  upgrade charges only the days left, and a difference too small for the provider to charge is not
  charged at all (eliminate). A downgrade refunds nothing, and says so before it is confirmed.
- Left out: billing emails from the template (P1-6, below), a list of past invoices (the provider's
  pages have it), and credits or refunds for a downgrade.

### Who manages it

`statements` gain `billing: ['manage']`, and `ownerOnlyPermissions` gains the same entry: the owner
holds it, and no admin or custom role can, by the rule ADR 0033 set for `organization:delete`.
Choosing, changing, paying for and cancelling a plan spend the organization's money, which is the
decision of the person who may also delete it. Every member sees the state, because it decides what
they can do.

**Deleting an organization** deletes its row (`on delete cascade`) and must also stop the charges.
`beforeDeleteOrganization` (ADR 0033) enqueues `billing.cancel-at-provider` with the provider's
subscription id, when there is one. The job cancels at the provider at once, not at the end of the
period, and only once the organization is gone, so a deletion that fails after the hook cancels
nothing. Deleting an account that takes a sole-member organization with it
([ADR 0049](0049-delete-an-account-from-an-emailed-link.md)) enqueues the same job for that
organization. The template makes no refund; the provider's dashboard does, if the owner asks.
Notices that arrive afterwards name a customer that no row holds, and are ignored with a log line.

### The webhook route

This is a new kind of route: no session, no organization slug, and the caller is a provider.

- **Path.** `POST /api/webhooks/<provider>`, such as `/api/webhooks/asaas`, `/api/webhooks/stripe`
  or `/api/webhooks/fake`. Only the provider configured is registered; any other name answers 404.
  The URL given to the provider is on the web origin, `https://<web origin>/api/webhooks/<provider>`.
  The request goes through the Worker like every other, carries its secret
  ([ADR 0022](0022-accept-api-requests-only-from-the-web-worker.md)), and needs no exemption. It
  sends no `Origin`, so the CSRF check lets it through, and its body is JSON, which the pipeline
  already requires.
- **Built with `webhookRoute(provider, inbox)`** (`#libs/webhooks/webhook-route`), the counterpart of
  `publicRoute`, so no module writes a webhook handler of its own. In order, it:
  1. reads the raw body with `readBody`, under the 1 MiB limit, and never with `readValidJson`: a
     signature covers the bytes as sent, and parsing first would change them;
  2. hands the bytes and the headers to `provider.readWebhook`, which authenticates them in the
     provider's way (an HMAC over the raw body, or a token compared in constant time; ADR 0064)
     before parsing anything. A refusal is `401 webhook_unauthenticated`, with a warning
     `webhook refused` that names the provider and the reason, never the body. Nothing reaches the
     database before this step, so a flood of forged calls costs one hash each;
  3. in one transaction, inserts `(source, event_id)` into `webhook_event` with
     `on conflict do nothing`, enqueues `billing.sync-subscription` with the provider's ids when the
     row is new, and commits;
  4. answers `200 { "received": true }`, for a new notice, a repeat and a kind the template does not
     use alike, so the provider stops resending it. When the database is out of reach the answer is
     `503`, and the provider tries again.

  The transaction touches only platform tables, so it names no organization. The unit of work of
  [ADR 0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md) gains a
  platform form, `runAsPlatform`, which sends no `set_config`. `lint:deps` lets it bind only
  `webhook_event` and `job`.
- **Idempotent by event id.** A provider delivers at least once and may repeat a notice. The primary
  key keeps a second delivery from enqueueing a second job, for 30 days. After that, a replay
  enqueues a sync that changes nothing (next point).
- **The job reads the truth.** `billing.sync-subscription` does not apply the notice's payload. It
  asks the provider for the subscription's current state (`provider.subscription(id)`, with our
  secret key). It finds the organization by our row's `provider_customer_id`, and checks that the
  provider's `reference` names the same organization. Then, in `run(organizationId, …)`, it applies
  the state through the domain (`applyProviderState`), saves it with the row's version, and records
  an audit entry if anything changed. When the notice concerns the row's open checkout, the job reads
  that payment instead (`provider.payment(id)`) and, once it is paid, completes the first
  subscription or the upgrade ("Changing plan"). Therefore:
  - order does not matter: no provider promises it, and every sync writes the latest state;
  - a repeat, a replay, or a forged notice that passed authentication can at most make the API read
    the provider again;
  - a lost or failed sync is healed by the next notice for that subscription;
  - when two syncs run at once, the second save meets a version that moved, throws, and its retry
    reads again.

  It costs one or two calls to the provider per notice. The job's retries (about 43 minutes,
  [ADR 0056](0056-run-background-work-from-a-job-table-in-postgres.md)) cover a short outage of the
  provider. Beyond that the log shows `job failed`, and the operator requeues the job.
- **A notice for an unknown customer** (one created by hand in the provider's dashboard, or the
  customer of an organization deleted since) is logged as `billing event ignored`, and the job ends
  `done`.

### A retried upgrade does not pay twice

Money moves on the provider's hosted page, where the payer confirms it, for a first subscription and
for an upgrade's difference alike. No request of the template charges anything. The risk is two
checkouts paid, two subscriptions created, or one difference paid twice, for one organization: a
double click, a second tab, or a request sent again after a timeout. Writes have no
time limit on the web
([ADR 0041](0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)) precisely because one may have
gone through though its answer was late.

- **One open checkout per organization.** `POST …/billing/checkout`, for a first subscription or an
  upgrade, first claims the checkout on the row, inside `run`, with the row's version. The first
  request wins. A second sees the open checkout and gets its URL back while it has not expired; a
  request for another plan is refused until that one is paid, abandoned or cancelled. The first then calls the provider, outside the
  transaction (ADR 0052), and stores the checkout's id, URL and expiry. If the process dies between
  the claim and the store, the claim expires after 10 minutes, and a new checkout may start.
- **The provider's own guard, where it has one.** Stripe takes an `Idempotency-Key` on every `POST`,
  which the adapter derives from the organization and the row's version. Asaas has none, so its
  adapter looks the customer and its subscriptions up by our reference before creating anything, as
  Asaas's own documentation advises (ADR 0064).
- **The sync as the last net.** If the provider shows two live subscriptions for one customer, the
  job cancels the one our row does not hold and logs `billing duplicate subscription` at error, so
  the operator can refund.
- **A change of plan, a cancellation and a resumption carry the row's version.** A repeated one is
  refused with `409 subscription_changed`, and the screen reads again (ADR 0048).

**P2-1 does not come now.** Its trigger is the first write that moves money, and P0-6 has none: the
money moves on the provider's page, an upgrade's difference included. What a retry can duplicate
here is one checkout, and the row
guards that more precisely than a general store of answers would. P2-1 stays for the first product
write that charges from our own request (a no-show fee on a saved card, a refund), where no hosted
page stands between the click and the money.

### Audit entries

Every change of the row records an entry (ADR 0061) in the same `run`. The resource is
`subscription`, and the resource id is the organization's id. The actions are `checkout-started`,
`activated`, `upgrade-started`, `upgrade-abandoned`, `plan-changed`, `downgrade-scheduled`,
`downgrade-withdrawn`, `payment-failed`, `payment-recovered`, `cancellation-scheduled`,
`cancellation-withdrawn` and `cancelled`, each with the names of the fields that changed. The actor
is the owner (`member`) for what they asked for, and `system` for what a provider's notice brought.
Moving into read only is the clock, not a write, so it records nothing; the screens show its date.
The texts join the `audit` group of the dictionaries.

### Billing emails wait for P1-6

Emails are written inside `modules/identity`
([ADR 0057](0057-send-identity-emails-through-the-job-queue.md)), and a billing email would have to
import identity's internals. P0-6 therefore sends none. The states show on the screens above and in
the provider's own notices to the payer: Asaas sends due-date and overdue notices by default, and
Stripe sends receipts and failed-payment emails when the account turns them on (ADR 0064 says what
to switch on). "Your trial ends in 3 days" and "your payment failed", sent by the product itself,
come with P1-6, as jobs on the same queue.

### Threat model

The build adds these to [docs/security/threat-model.md](../security/threat-model.md), in the same
change as the code (its own rule). The numbers follow T46, and move if another change takes them
first.

- **Boundary B8, API and payment provider.** What crosses it: the provider's API keys, checkouts and
  subscription state, and the provider's notices, which arrive at `/api/webhooks/<provider>` through
  the Worker.
- **T47. A forged notice marks an organization paid, or cancels one that pays (S, T).** The adapter
  authenticates the raw body before anything is parsed or stored: an HMAC with a timestamp, or a
  token compared in constant time (ADR 0064). The job never applies a notice's content; it reads the
  subscription's current state from the provider with the secret key. A forged notice that passed
  authentication can at most cause a read. A notice about an unknown customer is ignored.
- **T48. A genuine notice replayed to roll a subscription back, or delivered twice or out of order
  (T).** `webhook_event` keeps each provider and event id for 30 days and enqueues once. Stripe's
  signed timestamp refuses a notice older than five minutes. The job writes the provider's current
  state, so neither order nor a late replay changes the result.
- **T49. A member uses more than the plan allows: a capability it lacks, more than a limit, or a
  write while read only, through a route that forgot the check or a body that names a plan (E, T).**
  Entitlements come only from the subscription row the tenant guard joins, never from a request.
  `requireMember` refuses `POST`, `PUT` and `PATCH` for a read-only organization in one place. A
  limited use case counts inside its transaction. The plan changes only through the owner's billing
  routes, after the provider accepted; the payment state changes only from the provider. A dearer
  plan's entitlements apply only once the provider confirms its difference was paid. The server
  computes that amount from the catalogue and the provider's period, never from the request, and
  waives it only below the provider's minimum charge. A downgrade waits for the end of the paid
  period, so an upgrade followed by a downgrade never gives a higher plan for a lower price. The
  web's copy only draws.
- **T50. A tenant pays for another, or a payment lands on the wrong organization: a checkout opened
  for an organization the caller does not own, one provider customer shared by two organizations, or
  a reference changed at the provider (S, T, E).** The organization comes from the path, behind
  `requireMember` with `billing:manage`, which only owners hold. The reference sent to the provider
  is the organization id the server set. A provider customer belongs to one row (a unique index).
  The job finds the organization by that row, and refuses, with an error line, a provider state whose
  reference names another one.
- **T51. Card data stolen from or through the template (I).** The template never draws a payment
  form. Every card is typed on the provider's pages, and the adapters call only hosted checkouts and
  payment pages, never a provider's card or card-token endpoints (ADR 0064).
- **Accepted risks.** Two creates at the same instant can pass a limit by one. A user can start
  another trial by creating another organization, bounded by the five organizations per user of
  ADR 0033. The screens can lag the provider by the time a notice takes. An upgrade whose
  difference falls below the provider's minimum is free, so upgrading in the last days of a period
  and downgrading at once gives those few days of the higher plan.
- **Assets and secrets** gain the provider's API key and webhook secret, kept and pushed as the
  other runtime secrets are.

### Why not the others

- **Option 2, plans in a table.** It suits a business that changes prices weekly from a back office.
  Here it is a second source the web would have to read on every screen, it would need an operator
  surface (P1-7) before the first plan existed, and it would let a limit change without review. A
  product that needs it moves the catalogue into a table behind the same `entitlementsOf`.
- **Option 3, plans at the provider.** Every provider names products and features its own way, so
  the catalogue would change with the adapter, and the entitlement check would wait on a provider
  call or a mirror kept in step. The provider holds the price it charges, sent with each checkout;
  the entitlements stay ours.
- **Option b, the plan's name.** It is shorter today and wrong with the third plan or the second
  kind of business, as the plan's own note says.
- **Option ii, a query of its own.** It adds a round trip to every tenant request, the cost P2-4
  exists to take back.
- **Option iii, a cache.** A change of plan would reach one instance and not another, and ADR 0020
  turned off the session cache on purpose. A cache is the answer when the membership read itself
  shows in the latency.
- **Option B, applying the payload in the request.** It applies whatever the notice says in arrival
  order, inside the provider's time limit. With a provider whose notices are authenticated by a
  fixed token (ADR 0064), a leaked token would let anyone mark an organization paid.
- **Option C, applying the payload in the job.** It is still exposed to the order and to a leaked
  token.
- **Option y, P2-1 now.** See "P2-1 does not come now".
- **An upgrade that applies at once and charges the new price from the next renewal.** Upgrading on
  day 1 and downgrading on day 29 would give the higher plan every month at the lower price.
- **An upgrade that applies at once and charges the difference afterwards.** Entitlements would run
  ahead of the money: a boleto never paid would still have given days of the higher plan, and taking
  them back needs a rule of its own. Waiting costs a card payer seconds and a boleto payer days.
- **A downgrade that applies at once, with a credit.** Credits are a balance to keep, to show and to
  spend, at every provider in its own way, for a case the end of the period already serves.

Sources: [Stripe: receive webhook events (signatures, retries, duplicates, order)](https://docs.stripe.com/webhooks),
[Stripe: idempotent requests](https://docs.stripe.com/api/idempotent_requests),
[Stripe: Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries),
[Asaas: about webhooks (at least once, event id, 14 days)](https://docs.asaas.com/docs/sobre-os-webhooks),
[Asaas: duplicate charges after a retry without idempotency](https://docs.asaas.com/docs/cobran%C3%A7a-duplicada-ap%C3%B3s-retry-sem-idempot%C3%AAncia),
[Asaas help centre: limits for creating charges (R$ 5.00 minimum)](https://central.ajuda.asaas.com/hc/pt-br/articles/31972480144795-Quais-s%C3%A3o-os-limites-para-cria%C3%A7%C3%A3o-de-cobran%C3%A7as),
[RFC 9110, 402 Payment Required](https://www.rfc-editor.org/rfc/rfc9110#name-402-payment-required).
Read on 2026-11-12.

### Consequences

- Good: modules ask for capabilities and limits. A new plan, or a new kind of business, is a change
  in one file, and the template's module shows both kinds of entitlement end to end.
- Good: the entitlement check adds no round trip to any request, and the web learns the same
  entitlements from the read it already makes.
- Good: read only is one rule in the tenant guard, and a failed payment never deletes anything.
- Good: changing provider touches one adapter and its variables. Tests and the end-to-end suite fail
  and recover payments on the fake, through the real webhook path.
- Good: forged, repeated, late or out-of-order notices cannot set a wrong state, because the state
  always comes from the provider.
- Good: the template never handles card data.
- Good: entitlements always follow money. An upgrade pays only for the days left, and no sequence of
  upgrades and downgrades gives a higher plan for a lower price, beyond the few days below a
  provider's minimum.
- Bad: identity's membership query now joins a billing table. The coupling is one statement, named
  here and covered by its database test.
- Bad: every change of price or limit is a deploy.
- Bad: each notice costs one or two calls to the provider, and the screens can lag the provider by
  the time a notice takes to arrive.
- Bad: a limit can be passed by one under concurrency.
- Bad: an upgrade paid by boleto waits days for its entitlements, and an upgrade is a payment of its
  own plus a change of price at the provider: two calls, kept together by the job's retries.
- Bad: the public surface keeps working for an organization in read only.
- Bad: a user can start a new trial by creating a new organization, up to the ceiling of five.
- Bad: no billing email comes from the product until P1-6. The payer relies on the provider's
  notices and on the screens.
- Bad: `runAsPlatform` is a second kind of transaction to keep confined to platform tables.
- Bad: organizations left unpaid stay in read only, with their data, until their owner deletes them
  or a product writes a retention policy.

## Revisit when

A product needs prices per seat or per use, yearly plans, credits for a downgrade, or plans in more
than one currency. Notices are lost often enough that a daily reconciliation with the provider is worth
its calls. P1-6 gives modules a way to send email (then add the trial and payment emails). A
product's first write charges money from our own request (then P2-1). A limit passed under
concurrency starts to matter (then lock the row in the limited use cases). The membership read shows
in the latency (then P2-4, then a cache). Organizations left unpaid cost enough storage to call for
a retention policy.
