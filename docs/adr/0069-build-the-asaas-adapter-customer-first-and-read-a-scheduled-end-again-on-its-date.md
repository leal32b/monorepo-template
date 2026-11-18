# 0069. Build the Asaas adapter customer first, and read a scheduled end again on its date

- Status: proposed
- Date: 2026-11-18

Builds the adapter of [ADR 0064](0064-start-billing-on-asaas-because-stripe-cannot-charge-recurring-pix-in-brazil.md)
on the port of [ADR 0067](0067-settle-what-adr-0063-left-open-in-the-billing-port-routes-and-jobs.md), and settles
what those two left to the build. It adds the optional `payer` ADR 0067 foresaw, and one job to ADR 0063's design.

## Context and problem statement

ADR 0064 mapped the port onto Asaas from its documentation, and listed eleven points to try in the sandbox
first. No sandbox key was available when the adapter was built (`apps/api/.env.sandbox` did not exist), so it
was built from the documentation alone, read again on 2026-11-13, and every sandbox point stays open
([operations](../operations.md#asaas)). Building it met questions neither record answers:

- **The customer.** Asaas's reference marks `name` and `cpfCnpj` required to create a customer, and the port's
  `startCheckout` must find or create one and return its id. The template knows neither.
- **A checkout's state.** Asaas has calls to create and to cancel a Checkout, none to read one back, yet
  `payment(checkoutId)` must say whether a page is open, paid or expired.
- **The end of a scheduled period.** Cancelling at the period's end sets an end date on the subscription. Asaas
  announces nothing when the paid period runs out, and only a notice makes the sync job run, so the row would
  stay active and ending for ever.
- **Timeouts and retries.** Asaas has no idempotency key, and its guides say a timeout does not mean a charge was
  not created, and that a 429 must not be retried at once.
- **A Pix or a boleto first checkout.** It is a subscription made by the API, paid on its first charge's invoice:
  when does it lapse, and who withdraws it, since no notice comes at a time the template chooses?
- **What a lost answer leaves.** A subscription created while its answer timed out keeps charging and notifying a
  payer who never sees it.

## Decision drivers

- The port, the routes and the use cases stay as ADR 0067 built them; additions are optional fields.
- No charge at a price or to a person the owner did not choose; no page left open that can take money the row does
  not expect (ADR 0067).
- The job reads the provider's truth and never applies a notice (ADR 0063).
- Nothing local changes when Asaas refuses or is out of reach: 503, and the owner or the job tries again.
- The key and the payer's data never reach a log or an error message.
- No account, card data or document stored by the template beyond the provider's ids.

## Considered options

For the customer:

1. **Customer first:** the plan page asks whom the charges name, and the adapter creates the customer, by our
   reference, before any page.
2. Let Asaas's Checkout collect the payer, and create the customer only for Pix and boleto.

For a checkout's state:

a. **Write where it lives in the id**, with the instant an Asaas Checkout lapses.
b. Probe with the cancel call.
c. Answer `open` until paid, and leave lapsing to the row's `expiresAt`.

For a scheduled end:

i. **Enqueue the sync job for `paid_through`** when the end is scheduled, in the row's transaction.
ii. Delete the subscription at Asaas at once, and keep access in the row until `paid_through`.
iii. Have the membership read treat an ending row as ended once `paid_through` passes.

## Decision outcome

Chosen options: 1, a and i, because a Pix or a boleto subscription needs a customer anyway and option 2 would leave
the port without a customer id for a card; a probe that cancels is not a read, and option c would never drop a
checkout the payer left; and option ii ends the subscription at Asaas before the owner stops paying for it, while
option iii writes the provider's state somewhere else than the job, which ADR 0063 keeps as the only writer of it.

### The payer

The checkout's input gains `payer: { name, taxId, email }` (`payerSchema` in `@repo/contracts`), and the port's
`startCheckout` takes it. `taxId` is a CPF or a CNPJ without punctuation, with its check digits, the alphanumeric
CNPJ issued since July 2026 included; the web takes it as printed. The email is where Asaas's notices of due and
overdue charges go, the only billing emails until P1-6; the form fills in the signed-in owner's. Only a
subscription at the full price asks: an upgrade charges the subscription's customer. The adapter names the customer
by what was typed each time (`PUT /v3/customers/{id}`), and creates one only after looking for ours by
`externalReference`. With no customer and no payer it refuses with `PayerRequiredException`, `400 payer_required`.
The template stores none of it: Asaas keeps the customer.

### Where a checkout lives

The port's `checkoutId` is the adapter's own, written so that `payment` and `cancelCheckout` know what to read:

| Id | What | Paid when | Expired when | Withdrawn by |
| --- | --- | --- | --- | --- |
| `checkout:<id>:<ms>` | An Asaas Checkout: a card's subscription (`RECURRENT`), or an upgrade by card or Pix (`DETACHED`) | a charge listed by `checkoutSession` is confirmed | its 30 minutes are over | `POST /v3/checkouts/{id}/cancel`; a 4xx (already paid, expired or cancelled) is nothing left to do |
| `subscription:<id>` | A Pix or boleto subscription made by the API | a charge is confirmed | its first charge is overdue, or it is deleted or inactive | deleting the subscription, unless a charge is paid |
| `payment:<id>` | An upgrade's boleto | it is confirmed | it is overdue or deleted | deleting the charge, unless it is paid |

Any other id is `expired`, as the port asks. A Pix is due the day it is asked for and a boleto three days later, so
the first charge falls overdue, and Asaas sends `PAYMENT_OVERDUE`, when the checkout lapses: that notice makes the
job withdraw it. An upgrade's boleto is created with `daysAfterDueDateToRegistrationCancellation: 0`, so it cannot be
paid once it lapses. A first boleto paid at the bank on its last day may still clear after the subscription was
deleted; the operator refunds it from Asaas's dashboard ([operations](../operations.md#asaas)).

Notices name the row by the customer, which every page carries (`customer` is sent to the Checkout): a checkout's
event cannot name the id, which holds the page's end. This replaces ADR 0064's "`checkout.id`" in `readWebhook`. A
one-off charge's notice also names `payment:<id>`.

### Looking before creating, and no retries

Asaas has no idempotency key. Before a Pix or boleto subscription is created, the customer's active subscriptions of
ours that were never paid are read: one for the same method and value, not overdue, is used again (a lost answer
retried); the others are deleted, so none keeps charging. A card's Checkout deletes them all, since it creates its
own. The adapter retries nothing: a timeout on a write may have written, a 429 must wait, and the layer above already
retries (the owner presses again and the look-before-create finds what was made; the job's backoff spans about 43
minutes, ADR 0056). Each call has 10 seconds, so a sync's dozen calls fit the job's lease of two minutes. Every
failure is a `BillingProviderUnavailableException` naming the call, its status and Asaas's error codes, never their
descriptions, which may quote what was sent.

### A scheduled end is read again on its date

"Cancel plan" removes the next period's charge if Asaas created it already, and sets `endDate` to the day before
`paid_through`; "Keep plan" clears it and sets `nextDueDate` back to `paid_through`, so the removed charge is created
again. In the same transaction as the row, `CancelSubscriptionService` enqueues `billing.sync-subscription` for
`paid_through`, with an event id of its own (`period-end:<subscription>:<instant>`). On that day the job reads the
subscription, which the adapter reports `cancelled` once `paid_through` has passed, and the end lands with its audit
entry by the system. Billing's unit of work gains the job queue on its transaction for it (ADR 0052). A provider that
announces the end, as the fake does, only makes the job read once more.

### The mapping, as built

ADR 0064's mapping, with what the build had to decide:

- A charge is paid at `CONFIRMED`, `RECEIVED`, `RECEIVED_IN_CASH` and `DUNNING_RECEIVED`; overdue at `OVERDUE` and
  `DUNNING_REQUESTED`. Refunds and chargebacks count as neither: a refunded renewal leaves the period paid until the
  next charge falls overdue.
- `pending` until a charge is paid; `past_due` while one is overdue, from its due date; `cancelled` once deleted or
  inactive, expired without an end set, or past the scheduled end. An end set while the period runs is
  `cancelAtPeriodEnd`, whether Asaas then says `ACTIVE` or `EXPIRED`.
- `paidThrough` is the due date of the first charge after the last one paid; with none created yet, the day after
  the scheduled end, or the subscription's `nextDueDate`. Dates are Brasília's calendar days, starting at 00:00
  −03:00.
- A refused card shows only once its charge is overdue, the day after the attempt: Asaas's charge has no status for
  a refusal, so `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` makes the job read a charge still pending.
- `reference` is the subscription's `externalReference`, or its customer's when a Checkout made the subscription.
- `changePlan` sends `updatePendingPayments: true`, so a charge Asaas already created for the next cycle takes the
  new value (ADR 0067's sandbox point 10, as the documentation answers it). Asaas changes a card subscription's
  value only on an account with card tokenization, which production enables on request.

### The minimize-support report

- Data entry (the payer): a CPF or CNPJ is checked before it is sent, its punctuation accepted, and the error says to
  check it (prevent); the email is filled in (eliminate); what was typed stays after an error (recover).
- External dependency (Asaas refuses or is out of reach): 503 with nothing changed, the alert says to try again
  (recover); a lost answer is found again on the next press (prevent duplicates); a notice the webhook could not
  take is resent by Asaas, and fifteen failures in a row stop its queue, which the operator restarts
  ([operations](../operations.md#asaas)).
- State (a Pix or boleto left unpaid): the checkout lapses when its charge falls overdue and the job withdraws it;
  nothing was charged, and "Choose" works again (recover).
- Account and billing (the end of a plan): it lands on its date by itself, read again then (eliminate a support
  contact about a plan that never ended).

### Consequences

- Good: an https environment starts once Asaas is configured, and the port, routes and use cases are as ADR 0067
  built them, plus one optional field.
- Good: no customer, subscription or charge is created twice by a retry, and none left by a lost answer keeps
  charging.
- Good: a scheduled end lands on its date with any provider, announced or not.
- Good: the payer's document is checked where it is typed and stored only at Asaas.
- Bad: the plan page asks for a document and a name on every full-price subscription, also when Asaas knows them.
- Bad: every point of ADR 0064's sandbox list is unverified, as are the new ones the build found
  ([operations](../operations.md#asaas)); the first sandbox run may change the adapter.
- Bad: a payer who leaves an Asaas Checkout keeps it "open" on the plan page until its 30 minutes run out.
- Bad: a refused card is seen a day late, and a refund or a chargeback is not seen at all until the next charge.
- Bad: changing a card subscription's price needs Asaas to enable tokenization on the production account.
- Bad: the checkout ids are the adapter's format; a row written by one adapter means nothing to another.

## Revisit when

The sandbox disagrees with the documentation on a point of the list in [operations](../operations.md#asaas) (fix
the adapter, and record here what changed); Asaas adds a call that reads a Checkout back (drop the page's end from
the id), an idempotency key, or a notice when a subscription ends; a product needs refunds or chargebacks to change
access; or the owners complain about typing the document again (then expose whether a customer exists in the
billing read).
