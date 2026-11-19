# 0070. Pay every Asaas method on an invoice made by the API, not on its Checkout

- Status: accepted
- Date: 2026-11-18

Changes [ADR 0064](0064-start-billing-on-asaas-because-stripe-cannot-charge-recurring-pix-in-brazil.md)'s
"The adapter, in the template's words" for a card and for an upgrade by card or Pix, its list of webhook events,
and [ADR 0069](0069-build-the-asaas-adapter-customer-first-and-read-a-scheduled-end-again-on-its-date.md)'s table of
checkout ids, its notices of a Checkout, and how `changePlan` reaches the charges already created. Everything else
of both stands.

## Context and problem statement

The first card subscription on the deployed app, with the sandbox's key, failed. The adapter opened an Asaas
Checkout with `chargeTypes: ['RECURRENT']` and our customer, and Asaas answered `400 invalid_object` six times: the
customer must have `phone`, `address`, `addressNumber`, `postalCode`, `province` and `city` before a Checkout can be
opened for it. The customer the adapter creates (ADR 0069) has a name, a CPF or CNPJ and an email. An upgrade by card
or Pix used the same Checkout with the same customer.

The sandbox key then became available, and the open points of ADR 0064 and ADR 0069 could be tried
([operations](../operations.md#asaas)). What they settled for the card: a subscription made by the API with
`billingType: CREDIT_CARD` and no card data is accepted; its first charge exists at once, with an invoice and our
`externalReference`; once that charge is paid by card, the subscription holds the card (brand, last digits and a
token), and every charge created after it carries the same card, which Asaas charges on its due date. Two more
findings touch the adapter: the sandbox answers `500` to `updatePendingPayments` on a boleto subscription, and it
refuses any `callback` until the account has a site registered (Minha Conta → Informações).

How does a card subscribe, and an upgrade get paid, without asking the owner for a phone and an address?

## Decision drivers

- The plan page asks only what Asaas needs to charge: the payer's name, document and email (ADR 0069).
- Card data is typed only on the provider's pages (ADR 0064, T51).
- One way for the three methods where the provider allows it: fewer paths, fewer tests, fewer surprises.
- A checkout's state must be readable back (ADR 0069 wrote a Checkout's end into its id because it was not).
- Paying works before the owner finishes the account's settings, and works better once they do.

## Considered options

1. **An invoice made by the API for every method**: the card subscribes on a subscription made by the API, paid on
   its first charge's invoice; an upgrade is a one-off charge paid on its invoice, for card and Pix as for boleto.
2. Asaas's Checkout without `customer`: the payer types their own data on it, and the subscription it creates is
   matched to the organization by the Checkout's id.
3. Ask the owner for a phone and an address on the plan page, and keep the Checkout with our customer.

## Decision outcome

Chosen option: 1, because the sandbox shows it keeps the card for the next charges with no data the template does
not ask, it is how Pix and boleto already subscribe, and every object it creates can be read back and carries our
reference. Option 2 creates a customer of Asaas's own, so our row's customer would not be the subscription's and a
notice could name the organization only by a Checkout id that its subscription and charges must carry. That rests on
fields the sandbox did not confirm for a recurring Checkout. Option 3 asks every owner for an address that a card's
invoice asks the cardholder anyway.

### The adapter, as it changes

| Port method | Before (ADR 0064, ADR 0069) | Now |
| --- | --- | --- |
| `startCheckout`, by card | An Asaas Checkout, `RECURRENT`, 30 minutes | A subscription made by the API, `billingType: CREDIT_CARD`, due today, paid on its first charge's invoice, as Pix (due today) and boleto (in three days) already were |
| `startPayment`, by card or Pix | An Asaas Checkout, `DETACHED` | A one-off charge made by the API, due today, paid on its invoice, as a boleto (in three days) already was |
| `payment`, `cancelCheckout` | Read three kinds of id, `checkout:<id>:<ms>` among them | Read `subscription:<id>` and `payment:<id>`; any other id, a `checkout:` of before included, is expired and has nothing to withdraw |
| `changePlan` | `PUT /v3/subscriptions/{id}` with `updatePendingPayments: true` | The subscription's value, then each pending charge's (`PUT /v3/payments/{id}`), since the first answers 500 on a boleto subscription |
| `readWebhook` | Took a Checkout event's customer | Ignores Checkout events; payments and subscriptions name the row by its customer and the subscription, as before |

The way back: a subscription and a charge are created with `callback.successUrl` set to the plan page. Asaas refuses
it while the account has no site registered; the adapter then creates them once more without it, so paying works
before the owner registers the site, and the payer comes back by themselves. A refusal for another reason is refused
again without the callback and thrown, so it still answers 503.

A card's lapsing follows its charge, as a Pix's does: due today, it is overdue at the start of tomorrow, when Asaas
sends `PAYMENT_OVERDUE` and the job withdraws the checkout (ADR 0069).

The webhook no longer needs `CHECKOUT_PAID`, `CHECKOUT_CANCELED` or `CHECKOUT_EXPIRED`; one already configured with
them gets each answered 200 and ignored.

### Consequences

- Good: a card subscribes with the payer's name, document and email only, as Pix and boleto do; the cardholder's data
  is typed on Asaas's invoice.
- Good: one way to subscribe and one way to pay an upgrade for the three methods; every checkout can be read back,
  so no id carries a page's end, and a payer who leaves an invoice is no longer counted "open" for 30 minutes on a page
  that was cancelled.
- Good: paying an overdue card charge on its invoice puts that card on the subscription (sandbox), so "Pay now"
  also replaces a card that keeps failing.
- Good: a downgrade's or an upgrade's price reaches the next charge for every method, boleto included.
- Bad: the payer reaches a page that charges now, not a page about a subscription: the plan page's message says what
  is paid and from when, as before.
- Bad: without a site registered in the account, the payer is not sent back to the plan page after paying; the
  owner's setup gains that step ([operations](../operations.md#asaas)).
- Bad: changing a plan costs one call per pending charge, at most one or two in practice.
- Bad: the automatic charge of the kept card on a later due date was seen only as the card on the charges Asaas
  created; the charge itself waits for a due date the sandbox runs daily.

## Revisit when

Asaas lets a Checkout use a customer without an address (then compare again, for its page); the sandbox charges the
kept card on a due date and does not (go back to option 2, or 3); `updatePendingPayments` works on a boleto
subscription (use it); or a product wants the payer back on the plan page without registering a site.
