# 0020. Authenticate with Better Auth, behind our own ports

- Status: accepted
- Date: 2026-10-28

## Context and problem statement

The plan left one question for the start of Phase 6: build authentication with a library, or
write our own? The answer depends on what a product built from the template must get for free.
The goal is that a new repository only configures providers. That means:

- email and password with a confirmed email;
- password reset;
- Google sign-in;
- MFA with TOTP and backup codes;
- rate limiting;
- sessions in a first-party cookie, as in [ADR 0019](0019-reach-the-api-through-the-web-worker.md).

Phase 6.5 adds organizations, roles and invitations on top.

Who writes these flows, and how does the rest of the API stay independent of that choice?

## Decision drivers

- Every flow above works by configuration, without product code.
- Fixes for the subtle cases come from code that many people review: account linking, token
  reuse, MFA bypass and open redirects.
- Product modules depend on our ports, not on the auth library
  ([ADR 0006](0006-api-architecture.md)).
- It runs on Node, on our Postgres through `pg` and Kysely, and has a Solid client.
- No per-user price, no user data outside our database, and it fits the free tiers.

## Considered options

1. [Better Auth](https://better-auth.com/docs) 1.7.14, an MIT-licensed library, mounted in the
   API.
2. Our own implementation on `node:crypto`, `arctic` (OAuth) and `@oslojs/otp` (TOTP).
3. A hosted identity provider (Clerk, Auth0, WorkOS).
4. A self-hosted identity server (Keycloak, Zitadel, Ory).

## Decision outcome

Chosen option 1.

**Mounting.** The composition root mounts `toNodeHandler(auth)` from `better-auth/node` at
`/api/auth/*`. It runs after the request id, CORS and the Worker check
([ADR 0022](0022-accept-api-requests-only-from-the-web-worker.md)). Better Auth reads its own
request bodies, so our JSON body reader never runs on those paths.

**Boundary.**
- Better Auth lives in `modules/identity/infrastructure/`.
- Our use cases and other modules see ports in `modules/identity/index.ts`. Phase 6 adds the
  current session (an actor, or a 401); Phase 6.5 adds membership and permission.
- A dependency-cruiser rule keeps `better-auth` out of every other module.
- Our guards read the session with `disableRefresh`, so our `GET` routes never write. Better
  Auth's own `get-session` refreshes the session, as it is designed to.

**Contracts.** `/api/auth/*` keeps Better Auth's request and response shapes, and the web calls
it through `better-auth/solid`. This is the one exception to "every request and response is a Zod
schema in `@repo/contracts`". `AGENTS.md` records it when the code lands. Our own routes keep
their contracts.

**Database.**
- `npx auth generate` produces the tables as SQL, committed as plain migrations
  ([ADR 0013](0013-kysely-and-plain-sql-migrations.md)) in a Postgres schema named `auth`.
- An upgrade that changes the schema comes with a new migration.

**Configuration (the template's defaults):**

- **Email and password.**
  - Turned on: `requireEmailVerification`, `sendOnSignUp`, `autoSignInAfterVerification` and
    `revokeSessionsOnPasswordReset`.
  - Passwords are 15 to 128 characters, with no composition rules: the length
    [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) asks for a password that
    is the only factor.
  - The `haveIBeenPwned` plugin refuses passwords found in breaches. It sends only the first 5
    hex characters of the SHA-1, and it fails closed.
- **Hashing.**
  - Argon2id from `node:crypto`, stable since Node 24.7, plugged in through
    `emailAndPassword.password`.
  - Parameters follow the
    [OWASP cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html):
    m=19 MiB, t=2, p=1. Better Auth's default is scrypt.
- **Sessions.**
  - 7 days, refreshed once a day of use (the defaults).
  - The cookie cache is off: every request reads the session row.
    GHSA-xg6x-h9c9-2m83 (an MFA bypass) came from that cache.
- **Cookie.**
  - Better Auth names it `__Secure-better-auth.session_token` and cannot emit the `__Host-`
    prefix that ADR 0019 asked for.
  - It is still host-only, `Path=/`, `Secure`, `HttpOnly` and `SameSite=Lax`, so it differs only
    in the prefix rule.
  - The risk the prefix closes is a parent-domain cookie. That needs a sibling host on the same
    site, and the threat model accepts it until a custom domain.
- **Google.**
  - On only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
  - It links to an existing account only when both Google and the account have confirmed the
    email: `requireLocalEmailVerified`, the default.
- **MFA.**
  - The `twoFactor` plugin with TOTP and backup codes; the browser draws the QR code.
  - It guards email-and-password sign-in; Google sign-in relies on the Google account.
- **Rate limit.**
  - On in production, with counters stored in Postgres.
  - The client IP comes from `X-Client-IP` (ADR 0022).
  - The built-in rules: 3 per 10 s on sign-in, sign-up and `/two-factor/*`, and 3 per 60 s on
    reset and confirmation emails.
- **Origins.** `baseURL` and `trustedOrigins` are the web origin, because OAuth callbacks come
  through the Worker.
- **Logging.** Better Auth logs through pino at `warn`, because at `info` it logs email
  addresses.
- **Telemetry.** Off. That is the default, and it is set explicitly anyway.
- **Plugins left out.** No oauth-proxy, OIDC provider, device authorization, magic link or API
  key: most of the 2026 advisories were in plugins of this kind. Turning one on goes through the
  [threat model](../security/threat-model.md).

**Organizations (Phase 6.5).** Better Auth's organization plugin, behind a guard on the path
(`/api/organizations/:id/...`), decided in its own record.

**Updates.** A weekly `pnpm audit --audit-level high` job runs in CI. A Better Auth advisory is
fixed the same week. The lowest acceptable version is 1.7.14, the latest on the day with no
known advisory.

Why not the others:

- **Option 2.** Every flow and every subtle case would be ours, with no outside review. Better
  Auth alone published 17 advisories in 2026, several in OAuth, MFA and rate limiting: these
  cases are many and easy to miss.
- **Option 3.** It charges per user, locks the product in, and keeps the users outside our
  database.
- **Option 4.** It adds a service to run, with more memory than the free tiers give.

### Consequences

- Good: every required flow comes from configuration, and its fixes come from upstream.
- Good: product modules see two small ports, so the library can be replaced behind them.
- Bad: a large dependency sits in the most sensitive path. The package has had 26 advisories
  since 2024 ([OSV](https://osv.dev/list?q=better-auth&ecosystem=npm)), so updates are a duty,
  not a chore.
- Bad: `/api/auth/*` is outside our contracts and our coverage gate. Integration tests through
  HTTP, on PGlite, cover the flows we rely on.
- Bad: upgrades may change the schema, and each such change needs a migration.
- Bad: the cookie loses the `__Host-` prefix of ADR 0019.
- Bad: while the breached-password service is down, sign-up and password changes fail.

## Revisit when

- A Better Auth advisory stays unpatched for more than a week.
- The project changes its license or stops being maintained.
- A product needs enterprise SSO (SAML, SCIM): then weigh its plugins against a hosted provider.
