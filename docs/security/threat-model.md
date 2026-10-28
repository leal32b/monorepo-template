# Threat model

- Scope: authentication (Phase 6). Phase 6.5 extends it with organizations and authorization.
- Date: 2026-10-28
- Method: STRIDE per trust boundary, kept short. Update this file in the same PR as any change
  to a flow, a provider, an auth plugin or a trust boundary.

## System

```
Browser ──TLS──▶ Cloudflare Worker (web origin)
                  ├─ static assets, _headers (CSP, frame-ancestors)
                  └─ /api/* ──TLS + X-Proxy-Secret + X-Client-IP──▶ API on Render (node:http)
                                                                     ├─ /api/auth/*  Better Auth
                                                                     ├─ /api/*       our routes
                                                                     ├──TLS──▶ Postgres (Neon)
                                                                     ├──HTTPS──▶ email provider
                                                                     └──HTTPS──▶ Google token endpoint
Browser ◀──redirects──▶ Google sign-in
```

Decisions behind it: [ADR 0019](../adr/0019-reach-the-api-through-the-web-worker.md) (the Worker
proxies `/api/*`), [ADR 0020](../adr/0020-authenticate-with-better-auth.md) (Better Auth),
[ADR 0021](../adr/0021-send-email-through-a-provider-neutral-port.md) (email) and
[ADR 0022](../adr/0022-accept-api-requests-only-from-the-web-worker.md) (the API accepts only the
Worker).

## Trust boundaries

| ID | Boundary | What crosses it |
| --- | --- | --- |
| B1 | Browser ↔ web origin | Untrusted input, the session cookie, OAuth redirects |
| B2 | Worker ↔ API | Every API request; the API is also public at `*.onrender.com` |
| B3 | API ↔ Postgres | Users, accounts, sessions, verification tokens, rate-limit counters |
| B4 | API ↔ email provider, API ↔ Google | Links with tokens; OAuth codes and tokens |
| B5 | GitHub Actions ↔ Render, Cloudflare | Deploy credentials and runtime secrets |

## Assets

- Credentials: password hashes, TOTP secrets, backup codes, OAuth tokens of linked accounts.
- Session tokens, and email confirmation and password reset tokens.
- Personal data: email address and name.
- Secrets: `BETTER_AUTH_SECRET`, `PROXY_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, the
  email provider key, and the Render and Cloudflare tokens.

## Attackers

- Anyone on the internet, with or without an account.
- Someone holding a victim's password from another breach (credential stuffing).
- A page on another site the victim visits (CSRF, clickjacking).
- Script injected into the web origin (XSS).
- A caller that skips the Worker and talks to the API directly.

## Threats and mitigations

Status: **in place** (in the code today), **Phase 6** (built in this phase), **accepted**
(a residual risk, with what would reopen it).

| ID | Threat | STRIDE | Mitigation | Status |
| --- | --- | --- | --- | --- |
| T01 | Password guessing and credential stuffing on sign-in | S | Better Auth rate limit, 3 requests per 10 s per IP on `/sign-in` and `/sign-up`, counters in Postgres so a restart does not reset them; minimum length 15; passwords found in breaches refused (`haveIBeenPwned`); TOTP for users who enable it | Phase 6 |
| T02 | Dodging the rate limit with a forged client IP | S | The API refuses requests without the Worker secret; the Worker overwrites `X-Client-IP` with `CF-Connecting-IP`; Better Auth reads only that header | Phase 6 |
| T03 | Session theft through XSS | I, E | Cookie `HttpOnly`; full CSP without inline script; Solid escapes text; no `innerHTML` in the web app | Phase 6 |
| T04 | Session theft in transit | I | HTTPS only: `.dev` (so `workers.dev`) is on the HSTS preload list, Render serves HTTPS; cookie `Secure` | in place |
| T05 | Session fixation | S | A new random token at every sign-in; the cookie is signed with an HMAC of `BETTER_AUTH_SECRET` | Phase 6 |
| T06 | CSRF on a state-changing request | T | Cookie `SameSite=Lax`; Better Auth checks `Origin` against the web origin; the API pipeline checks `Sec-Fetch-Site` (or `Origin`) on every `POST`, `PUT`, `PATCH` and `DELETE` and accepts only `application/json` bodies | Phase 6 |
| T07 | Clickjacking of the sign-in or MFA screens | T | `frame-ancestors 'none'` | in place |
| T08 | Finding out who has an account | I | Sign-up answers the same for a taken email (and still hashes); the owner of that address is told by email; sign-in and reset answer generically and keep timing close | Phase 6 |
| T09 | Pre-account hijacking: registering a victim's email first | S | Sign-in needs a confirmed email; Google is linked to an existing account only when both Google and the account have confirmed the address (fix of GHSA-g38m-r43w-p2q7) | Phase 6 |
| T10 | Reuse or theft of a confirmation or reset link | S, E | Single-use tokens that expire in 1 hour, sent only to the account's address; a reset ends every other session | Phase 6 |
| T11 | Open redirect through `callbackURL` | S | Better Auth accepts only trusted origins; the web sends relative paths | Phase 6 |
| T12 | OAuth flow attacks (state, code injection) | S | State and PKCE by Better Auth, version 1.7.14 or later (fixes GHSA-wxw3-q3m9-c3jr and GHSA-965c-763c-88jm); only the Google provider; no oauth-proxy, OIDC provider, device-authorization or magic-link plugin | Phase 6 |
| T13 | MFA bypass | E | Session cookie cache off (GHSA-xg6x-h9c9-2m83 came from it); TOTP checks limited to 3 per 10 s; backup codes are single use; turning MFA off asks for the password | Phase 6 |
| T14 | A database leak exposing credentials | I | Argon2id hashes (m=19 MiB, t=2, p=1); TOTP secrets and backup codes encrypted with `BETTER_AUTH_SECRET`; session tokens are useless without the cookie's HMAC, which needs that secret | Phase 6 |
| T15 | Exhausting the API with expensive hashing | D | Rate limits on every route that hashes; body size limits on our routes; 19 MiB per hash on a 512 MB instance | Phase 6 |
| T16 | Calling the API directly, around the Worker | S, T | Shared secret in `X-Proxy-Secret`, compared in constant time; only the health routes answer without it, and they are read-only | Phase 6 |
| T17 | Secrets leaking through logs or config | I | Env errors name variables, never values; the access log has no headers or bodies; Better Auth logs through pino at `warn`, because at `info` it logs email addresses; secrets live only in the `production` environment and are pushed by the deploy | in place, Phase 6 |
| T18 | A known vulnerability in a dependency | T, E | Weekly `pnpm audit --audit-level high` in CI; a Better Auth advisory is fixed the same week | Phase 6 |
| T19 | Phishing with look-alike email | S | Mail is sent from a domain the product verifies with its provider (SPF, DKIM, DMARC) | accepted until a product sets its domain |

## Accepted risks

| Risk | Why it is accepted | Reopen when |
| --- | --- | --- |
| Rate limits count per IP, not per account: stuffing spread over many IPs is not slowed | Per-account lockout lets anyone lock a victim out; breached passwords are already refused | Sign-in failures show up in the logs or a product holds sensitive data |
| MFA applies only to email-and-password sign-in; Google sign-in relies on the Google account | That is how Better Auth's `twoFactor` plugin works | A product requires MFA for everyone (Phase 6.5 can enforce it per organization) |
| An unconfirmed account squatting an address blocks that person's Google sign-in until they reset the password | The reset proves ownership and ends the block | Support requests about it; then purge unconfirmed accounts after a few days |
| Other Workers of the same Cloudflare account (`*.leal32b.workers.dev`) are the same site, so they could set cookies for the web origin and send same-site requests | Only the owner deploys there; `Origin` and `Sec-Fetch-Site` checks still apply | A custom domain is bought |
| The health routes stay reachable directly at `*.onrender.com` | Render and the deploy smoke test need them, and they reveal only up or down | Health starts returning more than status |
| No audit log of security events (sign-in, MFA changes, password resets) | Observability comes in Phase 9 | Phase 9 |
| The breached-password check fails closed: while it cannot be reached, sign-up and password changes answer 500 | Rare and visible; failing open would accept known passwords | The check fails often |
