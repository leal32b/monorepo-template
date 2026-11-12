# Threat model

- Scope: authentication (Phase 6), and organizations and authorization (Phase 6.5).
- Date: 2026-10-28; statuses updated on 2026-10-31, at the end of Phase 6; tenancy added on
  2026-11-04, from the organization plugin spike (`git show e4743cc:docs/organizations-spike.md`);
  statuses and logging updated on 2026-11-07, in Phase 9; account deletion (T34, T35) added on
  2026-11-08 ([ADR 0049](../adr/0049-delete-an-account-from-an-emailed-link.md)); T04 made
  independent of the domain the same day, with HSTS sent by the web origin; two accepted risks
  bounded by the daily purge of expired rows ([ADR 0050](../adr/0050-purge-expired-rows-daily-from-a-job-of-its-own.md));
  emails sent through the job queue (T37) added on 2026-11-11
  ([ADR 0057](../adr/0057-send-identity-emails-through-the-job-queue.md)); the public tenant surface
  (T38 to T43) added on 2026-11-12
  ([ADR 0059](../adr/0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)).
- Method: STRIDE per trust boundary, kept short. Update this file in the same PR as any change
  to a flow, a provider, an auth plugin or a trust boundary.

## System

```
Browser ──TLS──▶ Cloudflare Worker (web origin)
                  ├─ static assets, _headers (CSP, frame-ancestors, HSTS, COOP)
                  └─ /api/* ──TLS + X-Proxy-Secret + X-Client-IP──▶ API on Render (node:http)
                                                                     ├─ /api/auth/*  Better Auth
                                                                     ├─ /api/*       our routes, behind a session
                                                                     ├─ /api/public/* our routes, no session, rate limited
                                                                     ├──TLS──▶ Postgres (Neon)
                                                                     ├──HTTPS──▶ email provider
                                                                     └──HTTPS──▶ Google token endpoint
Browser ◀──redirects──▶ Google sign-in
```

Decisions behind it: [ADR 0019](../adr/0019-reach-the-api-through-the-web-worker.md) (the Worker
proxies `/api/*`), [ADR 0020](../adr/0020-authenticate-with-better-auth.md) (Better Auth),
[ADR 0021](../adr/0021-send-email-through-a-provider-neutral-port.md) (email) and
[ADR 0022](../adr/0022-accept-api-requests-only-from-the-web-worker.md) (the API accepts only the
Worker), [ADR 0033](../adr/0033-organizations-with-roles-in-the-database-behind-a-path-guard.md)
(organizations, roles and the tenant guard),
[ADR 0034](../adr/0034-keep-the-organization-slug-in-the-web-url.md) (the slug in the web URL) and
[ADR 0059](../adr/0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md) (the
routes a visitor reaches without a session, and their rate limiter).

## Trust boundaries

| ID | Boundary | What crosses it |
| --- | --- | --- |
| B1 | Browser ↔ web origin | Untrusted input, the session cookie, OAuth redirects |
| B2 | Worker ↔ API | Every API request; the API is also public at `*.onrender.com` |
| B3 | API ↔ Postgres | Users, accounts, sessions, verification tokens, rate-limit counters, organizations, members, roles, invitations, every tenant's records and its audit trail, and the emails waiting in the job queue with their links |
| B4 | API ↔ email provider, API ↔ Google | Links with tokens; OAuth codes and tokens |
| B5 | GitHub Actions ↔ Render, Cloudflare | Deploy credentials and runtime secrets |
| B6 | Organization ↔ organization | Every tenant's data, in the same tables and behind the same routes |
| B7 | Visitor ↔ organization | What a person with no account reads of a tenant and writes into it, through `/api/public/organizations/:organizationSlug` |

## Assets

- Credentials: password hashes, TOTP secrets, backup codes, OAuth tokens of linked accounts.
- Session tokens, and email confirmation and password reset tokens.
- Personal data: email address and name.
- Tenant data: an organization's settings, members, roles, invitations and, from Phase 7, its
  product records.
- What a visitor typed into a public form (a name, an email or a phone), and the client addresses
  the rate limiter counts, kept for a day.
- The audit trail: who did what to which record of an organization, and when, for a year; ids,
  codes and field names, never values.
- Invitation links: their id is enough to find the invitation, though only the invited address
  can use it.
- Secrets: `BETTER_AUTH_SECRET`, `PROXY_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, the
  email provider key, and the Render and Cloudflare tokens.

## Attackers

- Anyone on the internet, with or without an account.
- Someone holding a victim's password from another breach (credential stuffing).
- A page on another site the victim visits (CSRF, clickjacking).
- Script injected into the web origin (XSS).
- A caller that skips the Worker and talks to the API directly.
- A member of another organization, or a member of this one with a weaker role.
- Someone who holds an invitation link or an address that was invited.
- A visitor with no account, or a script posing as one, on a tenant's public routes.

## Threats and mitigations

Status: **in place** (in the code today) or **accepted** (a residual risk, with what would reopen
it).

| ID | Threat | STRIDE | Mitigation | Status |
| --- | --- | --- | --- | --- |
| T01 | Password guessing and credential stuffing on sign-in | S | Better Auth rate limit, 3 requests per 10 s per IP on `/sign-in` and `/sign-up`, counters in Postgres so a restart does not reset them; minimum length 15; passwords found in breaches refused (`haveIBeenPwned`); TOTP for users who enable it | in place |
| T02 | Dodging the rate limit with a forged client IP | S | The API refuses requests without the Worker secret; the Worker overwrites `X-Client-IP` with `CF-Connecting-IP`; Better Auth reads only that header | in place |
| T03 | Session theft through XSS | I, E | Cookie `HttpOnly`; full CSP without inline script; Solid escapes text; no `innerHTML` in the web app | in place |
| T04 | Session theft in transit | I | HTTPS only: the web origin sends `Strict-Transport-Security` on every page (`apps/web/public/_headers`), on any domain; Render serves HTTPS; cookie `Secure`; the deploy smoke test checks the header | in place |
| T05 | Session fixation | S | A new random token at every sign-in; the cookie is signed with an HMAC of `BETTER_AUTH_SECRET` | in place |
| T06 | CSRF on a state-changing request | T | Cookie `SameSite=Lax`; Better Auth checks `Origin` against the web origin; the API pipeline checks `Sec-Fetch-Site` (or `Origin`) on every `POST`, `PUT`, `PATCH` and `DELETE` and accepts only `application/json` bodies | in place |
| T07 | Clickjacking of the sign-in or MFA screens | T | `frame-ancestors 'none'` | in place |
| T08 | Finding out who has an account | I | Sign-up answers the same for a taken email (and still hashes); the owner of that address is told by email; sign-in and reset answer generically and keep timing close | in place |
| T09 | Pre-account hijacking: registering a victim's email first | S | Sign-in needs a confirmed email; a Google account whose email Google has not confirmed is refused; Google is linked to an existing account only when both Google and the account have confirmed the address (fix of GHSA-g38m-r43w-p2q7); from the account page, Google is linked only with the account's own email | in place |
| T10 | Reuse or theft of a confirmation or reset link | S, E | Single-use tokens that expire in 1 hour, sent only to the account's address; a reset, and a password change, end every other session | in place |
| T11 | Open redirect through `callbackURL` | S | Better Auth accepts only trusted origins; the web sends relative paths | in place |
| T12 | OAuth flow attacks (state, code injection) | S | State and PKCE by Better Auth, version 1.7.14 or later (fixes GHSA-wxw3-q3m9-c3jr and GHSA-965c-763c-88jm); only the Google provider; no oauth-proxy, OIDC provider, device-authorization or magic-link plugin | in place |
| T13 | MFA bypass | E | Session cookie cache off (GHSA-xg6x-h9c9-2m83 came from it); TOTP checks limited to 3 per 10 s; backup codes are single use; turning MFA on asks for the password and the app's first code, and turning it off or getting new backup codes asks for the password; the setup's QR code is drawn in the browser, so the TOTP key reaches no third party ([ADR 0023](../adr/0023-draw-the-authenticator-qr-code-in-the-browser.md)) | in place |
| T14 | A database leak exposing credentials | I | Argon2id hashes (m=19 MiB, t=2, p=1); TOTP secrets and backup codes encrypted with `BETTER_AUTH_SECRET`; session tokens are useless without the cookie's HMAC, which needs that secret | in place |
| T15 | Exhausting the API with expensive hashing | D | Rate limits on every route that hashes; body size limits on our routes; 19 MiB per hash on a 512 MB instance | in place |
| T16 | Calling the API directly, around the Worker | S, T | Shared secret in `X-Proxy-Secret`, compared in constant time; only the health routes answer without it, and they are read-only | in place |
| T17 | Secrets leaking through logs or config | I | Env errors name variables, never values; the access log has no headers or bodies; Better Auth logs through pino at `warn`, because at `info` it logs email addresses; secrets live only in the `production` environment and are pushed by the deploy | in place |
| T18 | A known vulnerability in a dependency | T, E | Weekly `pnpm audit --audit-level high` in CI (`.github/workflows/audit.yml`); a Better Auth advisory is fixed the same week | in place |
| T19 | Phishing with look-alike email | S | Mail is sent from a domain the product verifies with its provider (SPF, DKIM, DMARC) | accepted until a product sets its domain |
| T20 | Someone at a signed-in browser left open changes how the account signs in | E | Changing the password needs the current one; turning MFA on or off and getting new backup codes need the password; unlinking Google needs a session signed in within the last day; the only way left to sign in cannot be removed | in place |
| T21 | Reaching another tenant's data by changing an id in the path or the body (IDOR) | I, T, E | Every tenant route is `/api/organizations/:organizationId/...` and calls `requireMember`, which reads membership from the database; tenant queries filter on the id the guard returned, never on one from the body, inside a transaction that row-level security confines to that organization (T36); the plugin's own endpoints check membership of the id they are given (tested through HTTP) | in place |
| T22 | A tab left on one organization writes to another | T | The API reads the tenant only from the path, never from the session's active organization; the web keeps the slug in the URL, per tab | in place |
| T23 | Finding out which organizations exist through the API | I | `requireMember` answers 404 both for a missing organization and for one the caller is not in; ids are random 32-character strings; the web shows the same not-found for an unknown and a foreign slug | in place |
| T24 | A member defines a role with more than they hold | E | The plugin refuses a permission the creator lacks on `create-role` and `update-role` (seen in the spike); `organization:delete` is the owner's only and no custom role can hold it; at most 20 custom roles | in place |
| T25 | A member gives a stronger role to themselves or to an accomplice, through a role change or an invitation | E | A role can be given only by someone who holds all its permissions (our hooks on `invite-member` and `update-member-role`; the plugin guards only `owner`, and the spike showed the gap); a member cannot change or remove someone whose roles grant more; only an owner gives or removes `owner` | in place |
| T26 | A renamed or deleted role leaves members without permissions, or a later role with the old name hands them new ones | E, D | Renaming or deleting a role that a member or a pending invitation holds is refused; a role name with no definition grants nothing | in place |
| T27 | Locking an organization out by removing or demoting its last owner | D, E | The plugin refuses to let the last owner leave, be removed or be demoted (seen in the spike); only an owner gives or removes `owner` | in place |
| T28 | Someone other than the invited person joins through an invitation | S, E | Only the invited address can read, accept or reject it, with a confirmed email (`requireEmailVerificationOnInvitation`); it expires in 7 days; a re-invite cancels the old one; a wrong account is told only that the invitation is not theirs | in place |
| T29 | Using invitations to send spam from the product's domain | D, S | `invitation:create` is needed; 10 invitations per 60 s per user and per IP; 100 pending per organization; 5 organizations per user; the email names the inviter and the organization, with no free text | in place |
| T30 | Deleting an organization without the right, or by mistake | T, D | Only an owner deletes (checked in `beforeDeleteOrganization`, not only by permission); the web asks for the name to be typed | in place |
| T31 | Concurrent requests creating a duplicate membership or role | T | Unique indexes on `member (organizationId, userId)` and `organizationRole (organizationId, role)`, which the plugin checks only with a read | in place |
| T32 | A crafted slug that shadows a route or breaks out of a path | T | Slugs are lowercase letters, digits and hyphens, checked by the API on create and update; words used by top-level routes are reserved, and a test keeps that list in step with the router | in place |
| T33 | An open redirect through the return path after an invitee signs in | S | The return path must be a relative path on the web origin, checked before use | in place |
| T34 | Deleting someone's account from a session taken over, or from a browser left open | T, D | Asking only emails a link to the account's confirmed address; the link opens a page that deletes nothing until its button is pressed; the token is single use, expires in 1 hour and works only with a session of the same user (`deleteUser` with `sendDeleteAccountVerification`); an email scanner that opens the link changes nothing | in place |
| T35 | Deleting an account leaves an organization with members but no owner, or leaves data behind | D, E | The API refuses while the user is the only owner of an organization that has other members, before emailing and again before deleting; an organization only they are in is deleted with its records (`on delete cascade`); sessions, sign-in methods, two-step verification, memberships and the invitations they sent go with the user row | in place |
| T36 | A tenant query written without its organization filter (a new module, a raw fragment, a join) shows or changes another tenant's rows | I, T | Every tenant use case runs in a unit of work whose transaction switches to the `app_tenant` role and names the organization, both for that transaction only; a policy on each tenant table shows and accepts only that organization's rows, and the role has nothing on the `auth` schema. A test reads the catalog and fails for a tenant table without its policy; `lint:deps` refuses a repository built outside the unit of work ([ADR 0055](../adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md)) | in place |
| T37 | A link with a token read from the job table (a leaked backup, a read-only role, an operator's query) or from the logs, while its email waits or after | I, S | An `identity.send-email` job holds the link only while it waits: its kind is marked `secretPayload`, and the statement that ends the job, done or failed, sets the payload to `null`; five attempts end within about 48 minutes, before the 1-hour link expires; no job log line carries a payload, and `last_error` keeps only the provider's status and error code ([ADR 0057](../adr/0057-send-identity-emails-through-the-job-queue.md)) | in place |
| T38 | Reading a tenant's data without a session through a public route, or finding out which organizations exist faster than their public pages already tell | I | A public route returns a schema of its own (`public…` in `@repo/contracts`), written field by field, with no id; the profile shows the name, slug, time zone and currency; an unknown slug answers the same `404 organization_not_found` on every public route, before the body is read; every request, hit or miss, is counted first: 60 reads a minute per address ([ADR 0059](../adr/0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)) | in place |
| T39 | A public write reaching another tenant's rows, by a crafted slug or body, or by a use case's mistake | T, I, E | The organization comes only from the slug in the path, resolved by `publicRoute`; the body's schema is strict and carries no id; the use case runs in the unit of work with that organization's id, so row-level security refuses a row of another (T36); a test hands the transaction such a row | in place |
| T40 | Filling a tenant with rubbish through a public form, or exhausting the API with it | D, T | 10 writes per 10 minutes per address, counted in Postgres before the slug is resolved or the body read; the Worker's secret, the `Origin` check, JSON-only bodies, the 1 MiB limit and a length on every field stand in front (T06, T15, T16); a honeypot field drops what form-filling scripts send, with the usual answer; what a visitor created is recorded with the actor `visitor` in the audit trail, so members can tell it apart and remove it | in place |
| T41 | Dodging our rate limiter: a forged or missing client address, or rotating inside an IPv6 block | S | The address is `X-Client-IP`, set only by the Worker, whose secret the public routes still need (T02, T16); an IPv6 address counts as its /64; a request with no usable address counts in one shared bucket, so a proxy that stops reporting it cannot turn the limit off; counters are in Postgres, so a restart or a second instance does not reset or double them | in place |
| T42 | Asking a public form whether a given person is a tenant's customer | I | The registration answers `202 { received: true }` whether it created a customer, the email was already one (nothing changes) or the honeypot was filled; the member's `409 customer_email_taken` never leaves a public route | in place |
| T43 | Using a public form to send email or SMS to a third party from the product's domain | S, D | A public write sends nothing to an address the visitor typed; a confirmation or a one-time code is not built, and the ADR says what it must limit when a product adds it | in place |
| T44 | A member erases or rewrites the trace of what they did, or makes the trail say someone else did it | R, T | Every write records an audit entry in the same transaction as the change, with the actor the tenant guard returned, never one from the body; under row-level security the tenant role may only insert and select the trail (no `update`, no `delete` grant), so no request path can change it, and a database test proves the refusal; only the purge, by retention, and the deletion of the organization remove entries ([ADR 0061](../adr/0061-keep-one-append-only-audit-trail-per-organization.md)) | in place |
| T45 | The trail as a second copy of a person's data, alive after the record was deleted | I | An entry holds ids, codes and the names of the fields a change set, never a value, a request body or an address; a deleted customer leaves a random id that points at nothing; entries go after 365 days and with their organization ([ADR 0061](../adr/0061-keep-one-append-only-audit-trail-per-organization.md)) | in place |
| T46 | Reading an organization's activity without the right, or exhausting the API with the read | I, D | The read needs `audit:read` (owner and admin by default), behind `requireMember` and row-level security; it pages by keyset, 25 entries a page, with no count; the daily purge bounds the table ([ADR 0061](../adr/0061-keep-one-append-only-audit-trail-per-organization.md)) | in place |

## Accepted risks

| Risk | Why it is accepted | Reopen when |
| --- | --- | --- |
| Rate limits count per IP, not per account: stuffing spread over many IPs is not slowed | Per-account lockout lets anyone lock a victim out; breached passwords are already refused | Sign-in failures show up in the logs or a product holds sensitive data |
| MFA applies only to email-and-password sign-in; Google sign-in relies on the Google account | That is how Better Auth's `twoFactor` plugin works | A product requires MFA for everyone, or per organization (left out of Phase 6.5) |
| An unconfirmed account squatting an address blocks that person's Google sign-in until they reset the password, for at most 7 days | The reset proves ownership and ends the block; the daily purge deletes accounts never confirmed after 7 days ([ADR 0050](../adr/0050-purge-expired-rows-daily-from-a-job-of-its-own.md)) | Support requests about it within those days; then shorten `identityRetention.unconfirmedAccountDays` |
| Other Workers of the same Cloudflare account (`*.<account>.workers.dev`) are the same site, so they could set cookies for the web origin and send same-site requests | Only the owner deploys there; `Origin` and `Sec-Fetch-Site` checks still apply | A custom domain is bought |
| The health routes stay reachable directly at `*.onrender.com` | Render and the deploy smoke test need them, and they reveal only up or down and the commit running (ADR 0046) | Health starts returning more than status and release |
| No audit log of security events (sign-in, MFA changes, password resets) | The request log (ADR 0046) keeps each call's route, status and time, but not who made it | A product holds sensitive data, or must answer who changed what |
| No email tells the owner of an account that its password changed, MFA was turned off or Google was linked | Better Auth sends none; each of these changes already needs the password or a recent sign-in (T20) | A product holds sensitive data, or an audit log is added |
| The breached-password check fails closed: while it cannot be reached, sign-up and password changes answer 500 | Rare and visible; failing open would accept known passwords | The check fails often |
| Slugs can be probed: the plugin's `check-slug` and `get-full-organization` tell an existing slug from a missing one, and so does the public profile, with no session, at 60 reads a minute per address | Slugs are names chosen to be read and shared; ids, the API's key, are random; `check-slug` is what lets a user pick a free slug | A product treats the organization's name as confidential |
| Every organization has a public profile and takes public registrations; none can opt out | The reference routes show the pattern, and a product replaces them; the profile shows only the name, slug, time zone and currency | Tenants ask to hide their public page: add the flag to the organization and to `PublicOrganizations.bySlug` ([ADR 0059](../adr/0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)) |
| Our rate limits count per client address, in fixed windows: a flood from many addresses is not slowed, people behind one address share a count, and twice the limit passes across a window's edge | Per-address counting needs no account and no third party; the limits are set with the factor of two in mind | `rate limited` lines or visitor-made rows show a flood from many addresses: put the edge's limiter or a CAPTCHA in front |
| A visitor is anonymous: nobody proves the email or phone they typed is theirs, and they cannot see or change what they sent | The reference write leaves nothing to come back to, and a public write sends nothing to the address (T43); the one-time code is a seam in ADR 0059 | A product lets a visitor see or change what they created, or acts on the contact without a member reading it first |
| Client addresses rest in `rate_limit` for up to a day | The limiter needs them while a window is open; the daily purge deletes the counters ([ADR 0050](../adr/0050-purge-expired-rows-daily-from-a-job-of-its-own.md)) | A product must not keep addresses at all: store a keyed hash of the address instead |
| Every member can list the organization's members and their emails | That is how the plugin's `list-members` works, and teams expect to see each other | A product needs members hidden from one another |
| Code that runs on the pool as the tables' owner (migrations, the purge job, a future job worker or back office) is not confined by row-level security, and the owner role bypasses it on the default host | The API keeps one connection string and no role is created by hand; tenant routes reach tenant tables only through the unit of work ([ADR 0055](../adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md)) | A product adds code that reads tenant tables outside a unit of work, or its threat model includes SQL injection: then connect the API as a second login role that is a member of `app_tenant` and owns nothing |
| An organization deleted is gone at once, with no grace period | The owner types the name first; Phase 7 decides what its records need | A product holds data that a mistaken deletion would make costly |
| An account deleted is gone at once, with no grace period; expired verification rows of its address stay until they expire | The emailed link and the last screen's button are two deliberate acts; the rows hold no secret that works without the account | A product holds data that a mistaken deletion would make costly, or must keep records after an account goes |
| Expired invitations stay in the table as `pending` for 30 days | They cannot be accepted, and the web hides them; the daily purge deletes them after 30 days, so support can still see why one failed ([ADR 0050](../adr/0050-purge-expired-rows-daily-from-a-job-of-its-own.md)) | A product must keep them longer for an audit |
