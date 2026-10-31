# 0021. Send email through a provider-neutral port

- Status: accepted
- Date: 2026-10-28

## Context and problem statement

Authentication ([ADR 0020](0020-authenticate-with-better-auth.md)) sends email:

- the link that confirms an address;
- the password reset link;
- a notice to the owner of an address someone tried to register again.

Phase 6.5 adds invitations. Providers differ: some offer an HTTP API, most also offer SMTP, and
free tiers change. Development and tests must work without any account.

How does the API send email, so that a product can change provider by configuration and one
adapter?

## Decision drivers

- Changing provider means changing configuration and at most one adapter, never the flows.
- Development and tests need no provider account and no network; tests can read the links that
  were sent.
- Each message is in the user's language (en or pt-BR).
- Links point to the web origin.
- No secret and no link is logged in production.

## Considered options

1. A port, `EmailSender`, with two adapters: one that logs, and one for a provider's HTTP API.
   The template's provider is [Resend](https://resend.com/docs/api-reference/emails/send-email),
   called with `fetch`, without its SDK.
2. SMTP through `nodemailer`, which nearly every provider accepts.
3. Calling a provider's SDK straight from Better Auth's callbacks.

## Decision outcome

Chosen option 1.

**Port and adapters.**
- The port lives in `libs/ports/`. It takes one ready message: recipient, subject, text and HTML.
- The adapters live in `libs/adapters/`. The identity module writes the messages, from
  templates in each language.
- The Resend adapter is about one `fetch` call, so a product that uses another provider replaces
  only that file.

**Choosing the adapter.**
- Configuration picks it at start-up. The log adapter prints the recipient, the subject and the
  link, so a developer can follow the flows.
- Env validation refuses the log adapter when the web origin is `https`, so production cannot
  silently drop mail.
- Tests use a fake that keeps the messages it was given.

**Language.** The web sends the locale it detected at sign-up. It is kept on the user, and every
later message uses it.

**Failures.** A failed send is logged and does not undo the sign-up. The user asks for a new link,
and that route is rate limited.

**Sending domain.**
- Delivering to any address needs a domain verified with the provider: SPF and DKIM, with
  DMARC recommended.
- Until a product verifies one, the template's instance can only deliver to the provider
  account's own address. That is enough to try every flow.
- The free tier is checked on the day the account is created.

Why not the others:

- **Option 2.** It brings a dependency and connection handling, and SMTP ports are blocked on
  some hosts. A product can still add an SMTP adapter behind the same port.
- **Option 3.** It spreads provider calls through the auth configuration, and tests have no seam
  to read the links.

### Consequences

- Good: flows are tested end to end by reading the link from the fake, with no network.
- Good: changing provider touches one adapter and the environment.
- Bad: a product needs its own domain before real users can sign up. It is the first setup step
  that is more than configuration.
- Bad: HTML templates are written by hand, without a templating tool.
- Bad: bounces and complaints are not tracked; the provider's dashboard is the only view.

## Revisit when

- A second transport is needed.
- Marketing email appears: it has other rules and other providers.
- Delivery problems call for provider webhooks.
