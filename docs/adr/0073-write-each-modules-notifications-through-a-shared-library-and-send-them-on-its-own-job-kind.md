# 0073. Write each module's notifications through a shared library, and send them on its own job kind

- Status: accepted
- Date: 2026-11-19

## Context and problem statement

Every email the API sends is written inside `modules/identity/emails` (`writeEmail`, its texts in en,
es and pt-BR) and sent by identity's job kind, `identity.send-email`
([ADR 0057](0057-send-identity-emails-through-the-job-queue.md)), through the `EmailSender` port of
[ADR 0021](0021-send-email-through-a-provider-neutral-port.md). Another module that wants to write to
someone has to import identity's internals, which the boundaries forbid. So billing sends nothing:
[ADR 0063](0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md)
and [ADR 0067](0067-settle-what-adr-0063-left-open-in-the-billing-port-routes-and-jobs.md) left "your
trial ends" and "your payment failed" to this item, and the payer gets only Asaas's own notices
([ADR 0064](0064-start-billing-on-asaas-because-stripe-cannot-charge-recurring-pix-in-brazil.md)). The
reference module, customers, cannot write to a customer either. And email is the only channel: a
product for small shops in Brazil will soon want WhatsApp or SMS.

Where does writing a notification live, how does a module declare its messages and texts, in whose
language and time zone is a text written, how do short messages fit, which job kind sends them, and
what does a recipient who opted out mean? And for billing, how does a payer avoid getting both our email
and Asaas's notice for the same event?

## Decision drivers

- A module writes its own messages, in its own folder, without importing another module's internals.
- One way to write an email, so every email looks the same and escapes the same.
- Every text in the recipient's language, every date in the organization's time zone, every amount in
  its own currency ([ADR 0053](0053-keep-time-zone-and-currency-on-the-organization-and-money-in-minor-units.md)).
- Short messages behind a port as provider neutral as email's, tried in development with no account.
- What ADR 0057 gave identity's emails stays: enqueued with the change that causes them, retried,
  a link forgotten when its job ends, identity's tests unchanged in what they prove.
- One message per event for the payer.

## Considered options

Where writing lives:

1. A library, `#libs/notifications`: the email layout, the texts' shape, the job each module builds
   from it, and the formatters. No routes, no tables.
2. A `notifications` module that owns a generic job, with every module's catalog registered into it.
3. Leave it in identity and export `writeEmail` from `#modules/identity/index`.

Which job kind sends:

A. One generic kind, `notifications.send-email`, whose handler finds the module's catalog by name.
B. One kind per module, `<module>.send-email`, built by the library from the module's texts.

When a value is formatted:

i. At the enqueue: the payload carries strings, already in the recipient's language and the
   organization's time zone.
ii. At the send: the payload carries instants and amounts with the time zone, and the handler formats.

## Decision outcome

Chosen options: 1, B and i.

**The library.** `apps/api/src/libs/notifications/` holds:

- `write-email.ts`: the one layout of ADR 0021 (a paragraph, a link, a footer, as text and as HTML,
  values and link escaped), moved from identity unchanged.
- `locales.ts`: the languages there are texts for (`locales`, `localeSchema`), en, es and pt-BR, which
  the user's `locale` field also accepts.
- `define-emails.ts`: `defineEmails(kind, texts, options)` takes a job kind and the module's texts, one
  object per language, each typed as the English one, and returns `{ job, write, register }`: the
  `JobDefinition` whose schema accepts only the module's message names and the languages there are
  texts for, the writer, and the registration of its handler with the `EmailSender` port.
- `format.ts`: `formatDay(instant, { locale, timeZone })` ("5 de dezembro de 2026"), on `Intl`, so a
  text never names a day in UTC. No text shows an amount yet; the first that does adds `formatMoney`
  beside it, in the amount's own currency.

It holds no I/O, so use cases may import it: dependency-cruiser's allowlist of `libs/` for use cases
gains `notifications`.

Option 2 makes a module that knows every other module's messages, or a registry filled at start-up, for
what a function does; option 3 keeps identity the owner of a layout it does not need to own.

**How a module declares a message.** A folder `modules/<module>/emails/` with `locales/en.ts`,
`locales/es.ts` and `locales/pt-BR.ts`, each a map from message name to `{ subject, body, action?,
footer }` with `{name}` tokens, and `<module>-emails.ts`:

```ts
export const billingEmails = defineEmails('billing.send-email', { en, es, 'pt-BR': ptBR })
```

The composition root registers each module's handler with `billingEmails.register(registrar,
emailSender)`, beside the module's other jobs, and a use case enqueues `billingEmails.job` on its unit of
work's queue, so the email is kept or dropped with the change that causes it (ADR 0052). A test in each
module writes every message in every language, and one in the library refuses an empty text.

**One kind per module (B).** Identity keeps `identity.send-email`, with `secretPayload: true` (its links
are credentials); customers and billing get `customers.send-email` and `billing.send-email`, whose
payloads are not secret. The kind in a `job failed` line says whose email it was, a module's schema
refuses another module's message names at the enqueue, and each module decides alone whether its payload
is a secret. A generic kind (A) would make every payload secret or none, and needs the registry of option
2.

**Language, time zone, currency (i).** The enqueuer knows them and the handler does not need to look
them up again: identity uses the user's `locale` (ADR 0021); customers and billing, the owner's. Dates are formatted with
the organization's `timeZone` (and amounts, when a text has one, with their own currency) at the
enqueue, so the payload holds the text's values as strings. The texts change only with a deploy, so a retry 40 minutes later writes the
same email (ii would format the same strings later, with more in the payload). A text that has a date
names the day only, never a time without its zone.

**Short messages.** A second port, `ShortMessageSender` (`#libs/ports/short-message-sender.port`), takes
`{ to, text }`: a number in E.164 and plain text. Two adapters: `LogShortMessageSender` logs the number
and the text, for development, as the email log adapter does; `RecordingShortMessageSender` keeps them,
for tests. No provider and no module sends one yet, so nothing builds them at start-up. The first module
that sends one adds, in the same change: a `defineShortMessages` beside `defineEmails` (the same shape,
plain text, one kind per module, `<module>.send-short-message`), the provider's adapter (Twilio, Zenvia
or Asaas's own, by one `fetch`, like Resend's), its configuration, and the refusal of the log adapter
when the web origin is `https`, as for email. WhatsApp differs from SMS: outside a 24-hour window after
the person wrote, the Business API sends only templates approved in advance, by name with parameters. A
WhatsApp adapter therefore needs the message's name and values rather than its text, and the port gains
them then; the texts stay ours for SMS.

**Opting out** is out of scope, and recorded here. Every message the template sends is transactional:
identity's account and invitation emails, and the organization's own state (a new customer, its
subscription) to its owner. None is marketing, so none needs an unsubscribe link. A product that sends
reminders or promotions adds then a table of opted-out addresses and numbers per organization, and the
job handler skips a recipient on it (logged, not failed).

**What moved.** Identity's texts stay in `modules/identity/emails/locales/`, now declared with
`defineEmails('identity.send-email', …, { secretPayload: true })`; `writeEmail` moved to the library with
its tests; `registerIdentityJobs` registers the same kind with the same payload. The behaviour, the
retries and the forgotten link of ADR 0057 do not change.

**The reference module's email.** When a visitor registers through an organization's public page
([ADR 0059](0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)), the owner gets
`customerRegistered`: the customer's name, the day in the organization's time zone, and "See customers".
A welcome to the visitor was the other candidate, and is refused: ADR 0059 holds that a public write sends
nothing to an address the visitor typed (T43), so the form cannot be used to write to a stranger. The
owner is an address the tenant gave, not the visitor. The email is enqueued in the registration's
transaction, so a registration whose email is already a customer, which rolls back, sends nothing, and a
filled honeypot writes nothing and sends nothing. T56 records what bounds a flood of these emails.

**Billing's emails**, to the owner of the organization, through `billing.send-email`, in the owner's
language and the organization's time zone, with "See plans" or "Pay now" opening the plan page:

| Message | When | Says |
| --- | --- | --- |
| `trialEnding` | 3 days before the trial ends (`trialReminder.daysBefore`), if still on trial | the trial ends in 3 days, on its date; then read only until a plan is chosen; nothing is deleted |
| `paymentFailed` | when a sync moves the subscription into `past_due` | the charge due on its date was not received; full access until the last day of the grace period; then read only until paid; nothing is deleted |

- The trial reminder is a job of its own, `billing.remind-trial-end`, enqueued with `runAt` when an
  organization is created: identity's new `OrganizationCreationListener` port, implemented by billing as
  `OrganizationDeletionListener` is. When it runs, it reads the row again and sends only to an
  organization still on trial whose trial has not ended, so a plan chosen meanwhile or a deleted
  organization sends nothing. A failed enqueue at creation is logged at error and does not undo the
  organization: the screens already show the trial's end. Organizations created before this change get
  no reminder; the template has none in production.
- The payment failure is enqueued by `billing.sync-subscription` in the transaction that saves the move
  into `past_due` and its `payment-failed` audit entry. A sync that finds it already past due sends
  nothing again.
- Both, and customers' email, find the owner through identity's new `OrganizationOwner` port (`ownerOf(organizationId)`: the
  oldest owner's email and `locale`, and the organization's name, slug and `timeZone`); none means the
  organization is gone, and nothing is sent.

**Our email or Asaas's notice.** Asaas notifies the payer by default of a charge created, its due date
coming, its due date today, an overdue charge (with SMS and a phone call), and a payment received. Ours
cover two events: the trial's end, which Asaas cannot know (there is no charge yet), and the overdue
charge. For the overdue charge we keep **ours and turn Asaas's off**: ours is in the owner's language,
names the day the organization becomes read only, which Asaas does not know, and opens our plan page,
where the overdue charge is paid on the invoice the API made (ADR 0070). Asaas keeps the notices we do not
send, which carry its invoice: the charge created, the due date coming, and the receipt. The runbook of
[operations.md](../operations.md#asaas) says which switches to turn off. A Stripe adapter would do the
same with its failed-payment email.

### Consequences

- Good: any module writes notifications with its own texts and no other module's internals; all emails
  share one layout and one escape.
- Good: billing tells the owner before the trial ends and when a payment fails, in their language and
  with the organization's dates; the payer gets one message per event.
- Good: the reference module shows the whole path, from a use case's transaction to the provider.
- Good: the short-message port is ready for a provider, and testable without one.
- Bad: each module that writes adds a job kind and a registration in `createJobs`.
- Bad: a payload's values are frozen at the enqueue: a rename of the organization before a retry is not
  seen. Nothing waits long enough for it to matter, except the trial reminder, which looks the owner up
  when it runs.
- Bad: a flood of public registrations becomes a flood of emails to the owner, bounded by the public
  write's limit per address (T56).
- Bad: no opt-out exists; the first non-transactional message must add it.
- Bad: organizations created before this change get no trial reminder.

## Revisit when

A module wants a message that is not transactional (add opting out); a short-message provider is
chosen (add its adapter and `defineShortMessages`); a WhatsApp template is needed (the port carries a
name and values); an email needs more than one link or a table (the layout grows); or owners report
missing or doubled billing notices (check the Asaas switches before the code).
