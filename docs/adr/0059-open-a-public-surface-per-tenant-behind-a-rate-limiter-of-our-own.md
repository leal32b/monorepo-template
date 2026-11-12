# 0059. Open a public surface per tenant, behind a rate limiter of our own

- Status: accepted
- Date: 2026-11-12

## Context and problem statement

Every route is either Better Auth's or behind `requireActor` / `requireMember`
([ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md)), and the only
rate limiter is the one inside Better Auth, which counts its own endpoints. A B2B2C product needs
people who are not members to reach a tenant: a barbershop's client who books online has no account
and never will have a membership.

Opening that door raises questions the member routes never had to answer. How does a route name its
tenant without a session, and how does its write stay inside that tenant
([ADR 0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md))? What slows
a caller nobody can sign out? What may an anonymous caller read? Who is the end customer to the
system? And what stops a form on the open internet from filling a tenant with rubbish?

This record decides the API side and shows it in the reference module. The web side (a route group
outside the session guard, with its own frame) is built on top of it.

## Decision drivers

- A new public route cannot be written without the limiter, as a tenant route cannot be written
  outside the unit of work.
- A public write is confined to its organization by the same row-level security as a member's.
- An anonymous caller learns nothing a member's response would tell: not an id, not who is already
  a customer.
- The API has no memory shared between instances, and no infrastructure beyond Postgres.
- The limiter is cheap enough to run before everything else on a public request.
- No second account system, and nothing built that the reference module does not use.
- Nothing here depends on one host: the client address is whatever the trusted proxy reports
  ([ADR 0022](0022-accept-api-requests-only-from-the-web-worker.md)).

## Considered options

How a public route names its tenant:

1. The organization's slug in the path, under a prefix of its own: `/api/public/organizations/:organizationSlug/...`.
2. The organization's id in the path, as the member routes do.
3. A subdomain or a custom domain per organization.

Where the limiter's counters live:

A. A table of our own in Postgres, one upsert per request.
B. Better Auth's `rateLimit` table and its rules.
C. Memory of the process.
D. The edge (the Worker, or the host's rate-limiting product).

The end customer's identity:

i. Anonymous, with a one-time code to the email or phone when they need to see or change what they
   created; the code built now.
ii. Anonymous now; the one-time code left as a seam, built by the product whose visitors have
    something to come back to.
iii. A second kind of account (a visitor signs up).

What stops abuse of a public write beyond the limiter:

a. A honeypot field.
b. A signed proof that the form was rendered, with a minimum time before it may be sent.
c. A CAPTCHA service.
d. A ceiling of public writes per organization.

## Decision outcome

Chosen options: 1, A, ii and a.

### The path and the guard

Public tenant routes live under `/api/public/organizations/:organizationSlug`. The slug is the name
the organization chose to be read and shared ([ADR 0034](0034-keep-the-organization-slug-in-the-web-url.md));
the id stays the member routes' key and never appears in a public response. "Public" means without
a session, not without the Worker: these routes still need `X-Proxy-Secret`, so the client address
they count is one no caller can forge. (`PUBLIC_PATHS` in `app/http-routes.ts` is the older, other
meaning: the two health routes served without the secret.)

A public route is built with `publicRoute(surface, limit, handler)` from `#modules/identity/index`,
the counterpart of `requireMember`. In order:

1. it counts the request against `limit` for the client address, and answers 429 past it;
2. it resolves the slug to an organization through the `PublicOrganizations` port, on the pool, and
   answers `404 organization_not_found` when there is none (a slug that cannot be one is refused
   without a query);
3. it calls the handler with the organization.

The organization, and so the id a use case needs, comes only out of `publicRoute`: a module has no
other way to turn a slug into an id, so it cannot write a public route that skips the limiter. The
handler has no actor: there is none.

The use case then does its database work inside `unitOfWork.run(organization.id, …)` exactly as a
member's does. The transaction runs as `app_tenant` with that organization named, so Postgres shows
and accepts only its rows (ADR 0055); a public write that named another organization's row would be
refused by the policy, not by the code's care.

Option 2 would put a 32-character id in a link a shop prints on its door. Option 3 needs a wildcard
domain and certificate the template's default hosts do not give for free; a product that buys one
maps the host to a slug in the Worker and keeps these routes.

### Enumeration

A slug is public by intent, and the threat model already accepts that it can be probed. What the
public surface adds is bounded in two ways. Every answer, hit or miss, is counted first, so one
address reads at most 60 slugs a minute, whatever it finds. And an unknown slug answers the same
`404 organization_not_found` on every public route, read or write, before the body is read: a write
tells nothing about a slug that the profile read does not already tell, and the profile tells only
what the organization shows the world.

Every organization has a public profile; there is no switch to hide one. The reference routes exist
to show the pattern, and a product replaces them. A product whose tenants must opt in adds the flag
to the organization and to `PublicOrganizations.bySlug`, the one place every public route passes.

### The rate limiter

A port, `RateLimiter.hit(limit, subject)`, with a Kysely adapter over a table of our own
(migration `0011_public_surface.sql`) and an in-memory fake under the same contract suite.

- **One statement.** `insert … on conflict (key) do update … returning`: a fixed window per key,
  started by the first request, the count raised by every request. One round trip on the pool,
  outside any transaction, before the slug is looked up or the body read. It is the platform's
  table, not a tenant's: `app_tenant` has nothing on it.
- **The key** is the limit's name and the client address: `public-write:203.0.113.7`. The address is
  `X-Client-IP`, which only the Worker sets (ADR 0022). An IPv6 address counts as its /64, the
  block one subscriber is given, so rotating through it does not reset the count; an
  IPv4-mapped address counts as its IPv4.
- **No address** (a direct call in development, a proxy that stopped reporting it, or a value that
  is not an address): the key is `<limit>:unknown`, one bucket shared by every such request. The
  limit then still holds, at the price of those callers sharing it. Falling open would let a
  misconfigured proxy turn the limiter off in silence.
- **The limits** are named constants, `publicLimits` in `modules/identity/public-route.ts`:
  `read` 60 per minute and `write` 10 per 10 minutes, per address. A product changes them there or
  passes a limit of its own for one route.
- **The refusal** is `429 rate_limited` with `Retry-After` in seconds, the time left in the window.
  The problem carries the same number as `retryAfter`, a new optional member of the problem
  contract, so the web can say "try again in 40 seconds" without reading headers. A warning
  `rate limited` goes to the log with the request id, the limit's name and the seconds
  ([ADR 0046](0046-observe-through-structured-logs-tagged-with-the-release.md)); the address stays
  out of the log, and is in the table for whoever must look.
- **When the database is out of reach** the limiter fails with it and the request answers 503
  ([ADR 0047](0047-put-time-limits-on-every-database-wait.md)): closed, like everything else.
- **The clock** is the API's `Clock`, passed with the statement. Two instances a second apart
  disagree by a second about where a window ends, which a limit counted in minutes does not notice.
- **The purge.** The daily job ([ADR 0050](0050-purge-expired-rows-daily-from-a-job-of-its-own.md))
  deletes counters whose window started more than 24 hours ago, in batches, as it does Better
  Auth's.

Option B would write our keys into a table whose shape and meaning belong to a library, and whose
rules are keyed by Better Auth's own paths. Option C resets on every deploy and counts per instance,
so two instances double every limit. Option D is the right first line when a product has it, and
nothing here is in its way, but it belongs to one host and cannot be tested in this repository.

A fixed window lets a caller send up to twice the limit across a window's edge. A sliding window
needs a second statement or a row per request; the limits here are set with that factor in mind.

### What a public route returns

A projection of its own, with its own schema in `@repo/contracts`, named `public…`: never the
member's schema, and never the row. The reference read returns `publicOrganizationSchema`: `name`,
`slug`, `timeZone` and `currency`, what a booking page needs to greet a visitor and to draw times
and prices ([ADR 0053](0053-keep-time-zone-and-currency-on-the-organization-and-money-in-minor-units.md)).
No id, no member, no count of anything.

A public write answers the same whatever it found. The reference write answers
`202 { "received": true }` when it created a customer, when the email already belongs to a customer
of that organization (it then changes nothing), and when the honeypot was filled (it then writes
nothing). The member's `409 customer_email_taken` on this route would let anyone ask a shop's
public form whether a given address is its customer. 202 says what is true in all three cases: the
request was taken in.

### The end customer's identity

A visitor is anonymous. The template does not build the one-time code, and builds no second account
system: a visitor never becomes a row of `auth.user`.

Why not now. The reference write leaves the visitor nothing to come back to: there is no screen
where they see or change what they sent. A one-time code built for it would be a flow with no use,
in three languages, that nobody could test as a user. It also sends a message to an address a
stranger typed, which is its own abuse (the form becomes a way to send mail from the product's
domain, T29 again without the permission), and a code by phone needs an SMS port the template does
not have. The product that first lets a visitor see or change something decides those with the real
flow in front of it.

The seam it builds on:

- `publicRoute` resolves the organization and nothing else. Proof of who the visitor is becomes a
  second guard, called by the handlers that need it: it reads a short-lived token bound to one
  organization and one contact, and returns that contact. Routes that need no proof stay as they
  are.
- The contact is already kept: the customer's email or phone, of which the public form requires one.
- Sending the code is a job kind through the queue and the `EmailSender` port
  ([ADR 0056](0056-run-background-work-from-a-job-table-in-postgres.md),
  [ADR 0057](0057-send-identity-emails-through-the-job-queue.md)), with `secretPayload`.
- Asking for a code and checking one each take a limit of their own from the same limiter, keyed by
  the address and, for the check, by the contact.
- The code's own table belongs to that product's migration: hashed code, organization, contact,
  expiry, attempts left.

Option iii would give every barbershop's client a password to forget and the product a second set
of sign-up, reset and deletion flows.

### Abuse of a public write

What already stands in front of any write: the Worker's secret, a JSON-only body no foreign form
can send, the `Origin` check, the 1 MiB body limit
([ADR 0007](0007-http-pipeline-on-node-http.md)), and a strict schema with a length on every field.
The limiter adds the count per address. On top:

- **A honeypot field** (option a). The public input schema has `referralCode`, a field the web
  renders where no person sees or reaches it, with autofill off. A request that fills it gets the
  usual 202 and writes nothing; the log gets `public write ignored` with the reason. It costs a
  real visitor nothing and stops the crawlers that fill every field they find. The name is chosen
  to mean nothing to a browser's autofill: a field called `website` or `url` can be filled for a
  person by their browser, and their registration would vanish without a word.
- **A public write sends nothing** to an address the visitor typed: no confirmation email, no SMS.
  The form cannot be used to reach a third party.
- **What a visitor creates is marked.** The reference write records a line in `customer_change` with
  the action `created` and the actor kind `visitor` (a visitor has no id), in the same transaction
  as the customer, so members (and the audit trail to come) can tell those rows from their own and
  remove them. The same migration adds `actor_kind` and lets `actor_id` be null for a visitor.

Rejected:

- **A signed proof that the form was rendered** (option b). It is one more request for a script:
  read the profile, wait three seconds, post. It costs a real visitor a failure of its own instead:
  a tab left open past the proof's life answers "reload and try again" to someone who did nothing
  wrong.
- **A CAPTCHA** (option c) is a third party and a privacy decision, out of the template's scope. It
  would sit in the controller, before the use case, behind a port.
- **A ceiling per organization** (option d). It turns a flood into a closed form: an attacker who
  cannot fill a shop's list can switch its public form off for everyone, and the members see
  neither. A product with a paid or confirmed step in its public flow has a better stop than a
  count.

### The reference pair

- `GET /api/public/organizations/:organizationSlug` (identity): the public profile. It is the
  smallest read that is real: every public page starts by asking whose page it is.
- `POST /api/public/organizations/:organizationSlug/customer-registrations` (customers): a visitor
  asks to be registered, with a name and an email or a phone. It lands as an active customer the
  members see in their list, with no company and no notes, which stay the members' fields.

The pair adds no product rule beyond "a contact is required", and exercises every decision above:
the slug, the limiter with both limits, a projection, the uniform answer, the honeypot, and a
two-table write as `app_tenant`.

### How a module adds a public route

[using-the-template.md](../using-the-template.md) has the steps. In short: a `public…` schema in the
contracts, a use case that takes the organization id, a controller wrapped in `publicRoute` with
`publicLimits.read` or `.write`, registered under `/api/public/organizations/:organizationSlug/`.

The [threat model](../security/threat-model.md) gains the boundary between a visitor and an
organization (B7), the threats T38 to T43 and five accepted risks.

### Consequences

- Good: a visitor reaches a tenant without an account, and the pattern is one function to copy.
- Good: no public route exists without its limit, and the limit survives restarts and counts once
  across instances.
- Good: a public write is confined by row-level security like any other, with no new role or policy.
- Good: a public answer reveals no id and no fact about who is already a customer.
- Good: our own routes can now be limited anywhere, not only the public ones: `enforceRateLimit` is
  generic.
- Bad: every public request costs one more round trip, a write to a counter. A public read is two
  round trips, a public write six.
- Bad: the limit is per address. A flood from many addresses is not slowed, and people behind one
  address (an office, a mobile carrier's NAT) share one count.
- Bad: a fixed window allows twice the limit across its edge.
- Bad: every organization has a public profile and accepts public registrations; none can opt out
  until a product adds the flag.
- Bad: a visitor whose email is already a customer is told the same "received" and nothing changes;
  if they typed a new phone, it is not kept.
- Bad: a visitor cannot see or change what they sent; the one-time code is a seam, not a feature.
- Bad: client addresses rest in the `rate_limit` table for up to a day.

## Revisit when

A product lets a visitor see or change what they created (build the one-time code on the seam);
tenants ask to hide their public page (add the opt-in); `rate limited` lines or public rows show a
flood from many addresses (put the edge's limiter or a CAPTCHA in front, or the proof of rendering
for the route under attack); or the limiter's upsert shows in the database's slow statements (move
the public reads' count to the edge).
