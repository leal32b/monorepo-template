# 0064. Start billing on Asaas, because Stripe cannot charge recurring Pix in Brazil

- Status: proposed
- Date: 2026-11-12

**Stripe cannot cover Pix, boleto and card for subscriptions on a Brazilian account.** Its own Pix
page says Pix Automático is not available to businesses domiciled in Brazil. A Brazilian Stripe
account can bill subscriptions by card and by boleto, and can take Pix only as a one-time payment,
by invitation. The owner chose Stripe on 2026-11-12, and the plan requires Pix and boleto (P0-6's
open question). This record therefore recommends **Asaas** for the first adapter, against that
choice, and keeps Stripe as the second. The owner decides.

## Context and problem statement

[ADR 0063](0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md)
put billing behind a port, with a fake for tests, and left the first real adapter to this record. The
worked example is a Brazilian small business (a barbershop, a pilates studio) paying a monthly plan
in BRL. In Brazil it may pay by card, by boleto or by Pix.

Two of Stripe's own pages seemed to disagree about recurring Pix. Its changelog of 2026-04-22, "Adds
support for Pix recurring payments", and its Pix Automático guide say subscriptions can be paid with
Pix in Brazil. Its Pix page was seen saying that Pix Automático is not available in Brazil.

Which provider does the first adapter call, what does the account need, what does each provider cost,
and what must the owner create in its dashboard?

## Decision drivers

- Card, boleto and Pix in subscriptions, on a Brazilian account, charging and settling in BRL.
- The payer types card data only on the provider's pages: the template draws no payment form (PCI
  scope stays with the provider).
- Notices that the adapter can authenticate, and a subscription's state that the API can read back
  from the provider (ADR 0063's job reads the truth, not the notice).
- A sandbox where a failed payment and a recovery can be produced.
- Fees, IOF and the settlement currency known before the first paying customer.
- Retries of failed payments that fit ADR 0063's grace period of 14 days.
- Nothing that depends on the template's hosts.

## Considered options

1. Asaas.
2. Stripe, with a Brazilian account.
3. Stripe, with an account outside Brazil, which can charge recurring Pix through Pix Automático.
4. Mercado Pago.
5. Pagar.me.

## Decision outcome

Chosen option: 1, Asaas, because it is the only one whose documentation confirms card, boleto and
Pix in subscriptions for a Brazilian account, in BRL, and its published fees are lower than Stripe's. What it
lacks (a signed notice, an idempotency key, a customer portal) is covered by ADR 0063's design, as
"What Asaas lacks, and what covers it" shows.

### The conflict, resolved

Both pages are right; they speak of different parties.

- Stripe's Pix page restricts by **where the business is domiciled**. It says, in Portuguese, "O Pix
  Automático não está disponível para empresas domiciliadas no Brasil" (Pix Automático is not
  available to businesses domiciled in Brazil), once in general and again under subscriptions. It
  also says that businesses outside Brazil can accept Pix from Brazilian customers, recurring Pix
  through Pix Automático included. Stripe's support article on payment methods in Brazil marks
  recurring payments as not supported for Pix.
- The changelog of 2026-04-22 (API version `2026-04-22.dahlia`) speaks of **where the customer is**:
  subscriptions paid with Pix "for customers in Brazil". It names no business location.
- The Pix Automático guide describes the flow for those businesses outside Brazil: the charge is
  presented in BRL and settled in the account's own currency (USD, EUR, GBP…), IOF of 3.5% applies
  to each recurring charge (paid by the customer by default), and a Brazilian customer may pay a
  business outside Brazil up to US$ 3,000 a day and US$ 10,000 a month.

So recurring Pix on Stripe works for a customer in Brazil who pays a business outside Brazil, and not
for a business in Brazil. On a Brazilian Stripe account, one-time Pix is also invitation only: the
Brazilian pricing page heads its Pix fee "somente por convite" (by invitation only), and the
payment-method table lists Pix's business locations as "BR (Invite only), US".

### How they compare

As read on 2026-11-12 (sources at the end). "Not stated" means not found on the pages read, which is
not the same as "no".

| | Asaas | Stripe, Brazilian account | Stripe, account outside Brazil | Mercado Pago | Pagar.me |
| --- | --- | --- | --- | --- | --- |
| Card in subscriptions | Yes; charged on each due date | Yes | Yes | Named in the overview | Yes |
| Boleto in subscriptions | Yes; each cycle's charge is paid by the payer | Yes; a voucher the payer pays at each renewal (not off-session), valid 3 days by default (0 to 60), never refundable | No (boleto needs a Brazilian business) | Overview names boleto for the solution as a whole; not stated for each cycle | Yes |
| Pix in subscriptions | Yes; each cycle's charge is paid by the payer | **No** | Yes, through Pix Automático | Overview names Pix for the solution as a whole; not stated for each cycle | Not listed |
| Recurring Pix with one authorization (Pix Automático) | Yes, by API, as a product apart from subscriptions | **No** | Yes | Not stated | Not stated |
| Hosted page to subscribe | Asaas Checkout, for card (recurring); Pix with recurring not stated; no boleto. A hosted invoice (`invoiceUrl`) for each charge | Checkout in subscription mode, card and boleto | Checkout, card and Pix | A payment link and a hosted form | Not stated |
| Payer changes the card without us | Not documented: the API route takes a card token or card data | Customer portal (it cannot update subscriptions paid by invoice) | Customer portal | Not stated | Not stated |
| Notice authentication | A fixed token in `asaas-access-token`, 32 to 255 characters; no signature of the body; published sender addresses | `Stripe-Signature`: HMAC-SHA256 over the timestamp and the raw body, five minutes of tolerance, rotation with two secrets for up to 7 days | Same | `x-signature` (`ts=…,v1=…`), HMAC; what is signed is not stated on the page read | Webhook pages not reachable on the day |
| Notice delivery | At least once; retries over hours; the queue is interrupted after 15 consecutive failures; events kept 14 days; order kept only in sequential mode | At least once, any order; retries for up to three days (a few hours in a sandbox) | Same | 22 s to answer | Not stated |
| Idempotency key | None; its docs say to keep our own id and look before creating again | `Idempotency-Key` on every `POST`, kept at least 24 hours | Same | Not stated on the pages read | Not stated |
| Failed card retried | Not stated for subscriptions; configurable for Pix Automático | Smart Retries: up to 8 attempts in 2 weeks by default (1 week to 2 months); then cancel, mark unpaid, leave past due or pause; not stated for boleto | Same | Not stated | A chargeback cancels the subscription |
| Sandbox | A separate account (`sandbox.asaas.com`, `api-sandbox.asaas.com/v3`), manual confirmation of charges, test cards that approve and refuse | Sandboxes, test cards that fail a renewal, test clocks that move a subscription through time | Same | Not checked | Not checked |
| Payer notices | Email and SMS by default (due date, overdue, received), per customer, changeable by API | Receipts and failed-payment emails, when switched on | Same | Not checked | Not checked |
| Settlement and IOF | BRL; no exchange, so no IOF | BRL; no exchange, so no IOF | The account's currency; IOF 3.5% per charge | BRL | BRL |

**Fees for one R$ 99.00 monthly charge**, from the published prices (illustrative):

| | Card | Boleto | Pix |
| --- | --- | --- | --- |
| Asaas | 1.99% + R$ 0.49 = R$ 2.46, "in the first 3 months" (the later rate was not on the page read) | R$ 0.99 or R$ 1.99 (the page shows both; which one is current could not be told) | R$ 0.99 or R$ 1.99 (same) |
| Stripe, Brazilian account | 3.99% + R$ 0.39, plus Billing's 0.7% = R$ 5.03 | R$ 3.45 plus 0.7% = R$ 4.14 | Not available in subscriptions (one-time: 1.19%, by invitation) |

Asaas charges no monthly fee. Stripe adds 2% for a card issued abroad. IOF is a Brazilian tax on
transactions that involve currency exchange, as Stripe's own Pix page defines it; a Brazilian account
charging BRL to Brazilians makes no exchange, on either provider.

### What Asaas lacks, and what covers it

- **A notice signed over its body.** Asaas sends a fixed token, with no timestamp. ADR 0063's job
  never applies a notice's content: it reads the subscription from Asaas with our API key. A leaked
  token therefore lets someone make the API read Asaas again, nothing more. The token is compared in
  constant time, hashed first, as the Worker's secret is (ADR 0022), and rotated like the other
  secrets. An edge rule that admits only Asaas's published addresses on the webhook path is optional
  hardening for a product whose host has one. It is not in the template, because the list can change.
- **An idempotency key.** Asaas's documentation says a timeout does not mean the charge was not
  created, and advises looking before creating again. The adapter looks the customer up by our
  reference (`externalReference`, the organization's id) before creating it, and the customer's
  subscriptions before creating one. ADR 0063's one open checkout per organization stands in front of
  both.
- **A customer portal.** "Pay now" opens the overdue charge's `invoiceUrl`, Asaas's hosted invoice.
  "Change payment" is a new checkout: once the new subscription is active, the sync cancels the one
  the row no longer holds (ADR 0063's "last net"). The template never calls the card or card-token
  endpoints.
- **A queue that stops.** After 15 consecutive failed deliveries, Asaas interrupts the webhook queue.
  It keeps new events for 14 days and deletes older ones. Only an HTTP 200 is certain to count as
  delivered (one page says only 200, another says any 2xx), and `webhookRoute` answers 200. A sleeping
  free host costs one or two failures, which a later success resets. A host down for hours can reach
  fifteen. [operations.md](../operations.md) gains how to see it (no notice applied for a while, and
  "Confirming your payment" pages that never confirm) and how to restart the queue: in the dashboard,
  or with `PUT /v3/webhooks/{id}` and `{"interrupted": false}`. Asaas then sends the stored events.

### The adapter, in the template's words

`#libs/adapters/asaas-billing-provider.ts`, with `fetch`, the key in the `access_token` header, and
a `User-Agent` (Asaas requires one for accounts created from 13 June 2024).

| Port method | Asaas |
| --- | --- |
| `startCheckout`, by card | An Asaas Checkout with `chargeTypes: ['RECURRENT']`, `billingTypes: ['CREDIT_CARD']`, a monthly `subscription` at the plan's value, the organization's id as `externalReference`, the return and cancel URLs as `callback`, and `minutesToExpire` of 30. Asaas creates the subscription when the payer finishes; its id arrives with `SUBSCRIPTION_CREATED`. |
| `startCheckout`, by Pix or boleto | The customer (looked up first, by `externalReference`), then a subscription by the API with `billingType` `PIX` or `BOLETO`. The owner is sent to the first charge's `invoiceUrl`. No card data is involved. |
| `paymentPage` | The `invoiceUrl` of the oldest overdue charge, or `null`. |
| `changePlan` | The subscription's new value, for future charges only. |
| `cancel`, `resume` | Delete the subscription (which also removes its pending and overdue charges) when cancelling now. Setting an end date at `paid_through`, and clearing it to resume, when cancelling at the period's end. |
| `subscription` | `GET /v3/subscriptions/{id}` and its charges, mapped below. |
| `readWebhook` | The `asaas-access-token` header against `ASAAS_WEBHOOK_TOKEN`. Then the event `id`, and the ids in `payment.subscription`, `subscription.id` or `checkout.id`. |

The mapping into ADR 0063's provider state:

- `active`: the subscription is active and no charge is overdue. A charge counts as paid at
  `PAYMENT_CONFIRMED` (paid, balance not yet available) as well as at `PAYMENT_RECEIVED`.
- `past_due`: a charge is overdue (`PAYMENT_OVERDUE`) or a card capture was refused
  (`PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`); `overdueSince` is that charge's due date.
- `cancelled`: the subscription was deleted or made inactive.
- `paidThrough`: the due date of the next charge after the last one paid.

The webhook subscribes to `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`,
`PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`,
`PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_DELETED`, `SUBSCRIPTION_CREATED`,
`SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED`, `SUBSCRIPTION_DELETED`, `CHECKOUT_PAID`,
`CHECKOUT_CANCELED` and `CHECKOUT_EXPIRED`. Order does not matter, because each one only makes the
job read the subscription, so either delivery mode works.

**Settled in the sandbox before anything is built.** These were not found on the pages read, and the
adapter's slice starts by trying each:

1. Whether Asaas Checkout accepts `PIX` with `RECURRENT`. Its reference lists `PIX` among
   `billingTypes`, but its recurring guide shows only card. If it does, Pix goes through Checkout too.
2. Which payer data a subscription by the API needs (CPF or CNPJ), so the plan page knows whether it
   must ask for it.
3. Whether a card subscription's overdue charge can be paid with another card or method on its
   `invoiceUrl`, and whether that changes the subscription's card.
4. How cancelling at the period's end maps: an end date, or something else.
5. Whether a refused card is tried again, and when.
6. How far ahead each charge is created: 40 days by default, with 14 or 7 as options. Seven keeps
   the payer from seeing next month's boleto at the start of this one.
7. When `PAYMENT_CONFIRMED` arrives for a boleto: at payment, or when the bank clears it.
8. Which of the two published Pix and boleto fees is current, and the card fee after three months.

### Environment variables

Configuration picks the adapter by the key that is set, as it picks email's (ADR 0063):

| Variable | |
| --- | --- |
| `ASAAS_API_KEY` | Secret. Its presence selects Asaas. `$aact_hmlg_…` in the sandbox, `$aact_prod_…` in production. |
| `ASAAS_API_URL` | `https://api-sandbox.asaas.com/v3` or `https://api.asaas.com/v3`. Env validation refuses a key whose prefix does not match the URL. A staging environment on `https` uses the sandbox. |
| `ASAAS_WEBHOOK_TOKEN` | Secret, 32 to 255 characters, no spaces, never the API key (Asaas's rules), for example `openssl rand -hex 32`. Required with the key. |

The two secrets are GitHub `production` secrets, pushed by the deploy to the API's host with the
others ([ADR 0014](0014-hosting-and-deploy-from-github-actions.md)); the URL is a variable.

### What the owner creates in Asaas

The accounts are the owner's to open. In each environment:

1. **A sandbox account** at `sandbox.asaas.com`. It is separate from production, with its own API
   key, generated after sign-up.
2. **The production account**, through Asaas's approval of the business's documents. Asaas's
   approval page says Pix can stay disabled depending on the account's data, so check that Pix is on
   before the first customer.
3. **An API key** for each, kept only in the GitHub secret.
4. **A webhook** for each: URL `https://<web origin>/api/webhooks/asaas`, the token of
   `ASAAS_WEBHOOK_TOKEN`, the events listed above, enabled, with an email for Asaas's notices.
5. **Payer notices** reviewed. Keep the due-date warning and the overdue notice: until P1-6 they are
   the only billing emails the payer gets. Asaas's default overdue notice includes a phone call;
   turn it off if that is too much for a small business.
6. **How far ahead charges are created** (item 6 above), set to 7 days if the account allows it.

### Stripe, if the owner keeps it

The decision is the owner's, and the port stays the same, so this is what choosing Stripe means:

- **What works:** card and boleto subscriptions; Checkout in subscription mode; the customer portal;
  signed notices; idempotency keys; Smart Retries; test clocks.
- **What does not:** Pix in subscriptions. One-time Pix only by invitation. Boleto subscriptions ask
  the payer to pay a new voucher at each renewal, and a boleto cannot be refunded.
- **Variables:** `STRIPE_SECRET_KEY` (a restricted key limited to Checkout, customers, subscriptions
  and the portal; its presence selects Stripe) and `STRIPE_WEBHOOK_SECRET` (`whsec_…`).
- **Dashboard:** a Brazilian account with boleto turned on; a webhook endpoint at
  `https://<web origin>/api/webhooks/stripe` with `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.paid` and `invoice.payment_failed`; Smart Retries ending in "leave past due", so ADR 0063's
  grace period decides when an organization becomes read only; customer emails on; the portal
  configured; and a sandbox for each developer and for CI.

### Why not the others

- **Option 2, Stripe with a Brazilian account.** It fails the plan's requirement: no Pix in
  subscriptions. Its card fee is also more than twice Asaas's published introductory one. Its notices,
  idempotency keys and portal are better, and they are what to come back for if Stripe opens Pix
  Automático to Brazilian businesses.
- **Option 3, Stripe with an account outside Brazil.** It needs a company abroad. It settles in a
  foreign currency, adds IOF of 3.5% to every charge (borne by the payer by default, or by the
  business), and limits a payer to US$ 3,000 a day. A Brazilian SaaS selling in BRL to Brazilian
  shops would pay an exchange and a tax on every charge to buy one payment method.
- **Option 4, Mercado Pago.** Its subscriptions overview names Pix and boleto, but the pages read do
  not say a recurring cycle can be paid with them. Its webhook page says the panel configuration is
  not available for subscriptions, and does not say what its signature covers. Too much would rest on
  a spike.
- **Option 5, Pagar.me.** Its subscriptions take card or boleto, with no Pix listed, and its webhook
  pages could not be reached on the day.

Sources, all read on 2026-11-12:
Stripe: [Pix payments](https://docs.stripe.com/payments/pix),
[changelog 2026-04-22, Pix recurring payments](https://docs.stripe.com/changelog/dahlia/2026-04-22/pix-recurring-payments-support),
[set up a subscription with Pix](https://docs.stripe.com/billing/subscriptions/pix),
[Pix Automático](https://docs.stripe.com/payments/pix/pix-automatico),
[accepted payment methods in Brazil](https://support.stripe.com/questions/accepted-payment-methods-in-brazil),
[enabling Pix in Brazil](https://support.stripe.com/questions/how-to-enable-pix-as-a-payment-method-in-brazil),
[Boleto](https://docs.stripe.com/payments/boleto),
[Boleto with Checkout](https://docs.stripe.com/payments/boleto/accept-a-payment?payment-ui=checkout),
[payment method support](https://docs.stripe.com/payments/payment-methods/payment-method-support),
[payment methods for subscriptions](https://docs.stripe.com/billing/subscriptions/payment-methods-setting),
[customer portal](https://docs.stripe.com/customer-management),
[pricing in Brazil](https://stripe.com/br/pricing),
[webhooks](https://docs.stripe.com/webhooks),
[webhook signatures](https://docs.stripe.com/webhooks/signature),
[idempotent requests](https://docs.stripe.com/api/idempotent_requests),
[Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries),
[subscription statuses](https://docs.stripe.com/billing/subscriptions/overview),
[trials](https://docs.stripe.com/billing/subscriptions/trials),
[sandboxes](https://docs.stripe.com/sandboxes),
[test clocks](https://docs.stripe.com/billing/testing/test-clocks).
Asaas: [subscriptions](https://docs.asaas.com/docs/assinaturas-recorr%C3%AAncia),
[subscriptions FAQ](https://docs.asaas.com/docs/faq-assinaturas),
[card subscriptions](https://docs.asaas.com/docs/criando-assinatura-com-cartao-de-credito),
[Pix Automático](https://docs.asaas.com/docs/pix-automatico),
[Pix Automático and subscriptions](https://docs.asaas.com/docs/diferen%C3%A7a-entre-pix-autom%C3%A1tico-e-assinaturas-1),
[Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas),
[recurring Checkout](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente),
[create a checkout](https://docs.asaas.com/reference/criar-novo-checkout),
[about webhooks](https://docs.asaas.com/docs/sobre-os-webhooks),
[receiving events](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint),
[queue interrupted](https://docs.asaas.com/docs/webhooks-queue-paused),
[queue penalties](https://docs.asaas.com/docs/penaliza%C3%A7%C3%A3o-de-filas),
[reactivating a queue](https://docs.asaas.com/docs/how-to-reactivate-an-interrupted-queue),
[official IP addresses](https://docs.asaas.com/docs/official-asaas-ips),
[payment events](https://docs.asaas.com/docs/webhook-para-cobrancas),
[subscription events](https://docs.asaas.com/docs/eventos-para-assinaturas),
[default notifications](https://docs.asaas.com/docs/notificacoes-padroes),
[duplicate charges without idempotency](https://docs.asaas.com/docs/cobran%C3%A7a-duplicada-ap%C3%B3s-retry-sem-idempot%C3%AAncia),
[sandbox](https://docs.asaas.com/docs/sandbox),
[authentication](https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1),
[account approval](https://docs.asaas.com/docs/aprova%C3%A7%C3%A3o-de-contas),
[prices](https://www.asaas.com/precos-e-taxas),
[card charges](https://www.asaas.com/cobranca-cartao).
Mercado Pago: [subscriptions](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview),
[webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks).
Pagar.me: [subscriptions](https://docs.pagar.me/reference/assinaturas-1).

### Consequences

- Good: card, boleto and Pix in subscriptions from one Brazilian account, in BRL, with no exchange and
  no IOF.
- Good: published fees below Stripe's on card and boleto, and no monthly fee.
- Good: prices go with each subscription, so no catalogue has to be kept in step in a dashboard.
- Good: Asaas notifies the payer of due dates and overdue charges by default, which stands in for the
  billing emails until P1-6.
- Good: Pix Automático is in the same API for a later step, when charging Pix without the payer's
  action each month is worth a flow of its own.
- Bad: the owner's choice of Stripe is reversed by this record; it needs the owner's approval.
- Bad: notices are authenticated by a fixed token with no signature or timestamp. ADR 0063's design
  makes a forged notice harmless, but the token is still a secret whose leak lets anyone call the
  route.
- Bad: no idempotency key and no customer portal. The adapter looks before it creates, and a change
  of card is a new checkout.
- Bad: a host down for hours can get the notice queue interrupted until someone restarts it, and
  events older than 14 days are then lost.
- Bad: Pix and boleto in a subscription ask the payer to pay each month. Only a card renews by
  itself, until Pix Automático is built.
- Bad: eight points are unverified on the pages read, and the adapter's slice starts in the sandbox
  to settle them.
- Bad: the Stripe adapter stays unbuilt until a product needs cards from abroad, or Stripe opens
  recurring Pix to Brazilian businesses.

## Revisit when

Stripe's Pix page no longer says Pix Automático is unavailable to businesses domiciled in Brazil (then
compare again: Stripe's notices, keys and portal are better); Asaas adds a signature over the body or
an idempotency key (use them); a product sells to payers abroad (add the Stripe adapter beside this
one); notices are lost to an interrupted queue more than once (add a daily reconciliation with the
provider); or the sandbox spike finds that one of the three methods does not work as these pages say.
