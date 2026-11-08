# Audit plan (temporary)

> Temporary working document. Delete it before the deploy that closes this work, as the finished
> build plans were removed in phase 9.

Findings of the audit of 2026-11-08, one item per session. All checks of the definition of done were
green at the start (1635 tests at 100% coverage, 45 end-to-end journeys, no known vulnerability), so
every item below improves behaviour in production or coherence; none fixes a broken build.

## How to use it

- Start each item in its own session with the model named, and paste: "Do item <ID> of
  `docs/audit-plan.md`."
- Each item follows the working agreement of [AGENTS.md](../AGENTS.md): TDD (`tdd-slice`), one ADR per
  decision (`write-adr`), `minimize-support` and `design-system` for anything the user sees, the
  visual review for screens, and the definition of done before it ends.
- When an item ends, set its status to `Done` with the commit, in the same commit.
- Opus for auth, tenancy, database and deploy decisions; Sonnet for everything else.

## Status

| ID | Item | Model | Depends on | Status |
| --- | --- | --- | --- | --- |
| A1 | Timeouts on the Postgres pool | Opus | — | Done |
| A2 | Account deletion | Opus | — | Done |
| A3 | Concurrency control in the reference module | Opus (decide), Sonnet (web) | — | Done |
| M1 | HSTS and the remaining security headers | Sonnet | — | Done |
| M2 | Purge expired rows on a schedule | Opus | A1 | Done |
| M3 | Automated dependency updates | Sonnet | — | Pending |
| M4 | Pin the Docker base image by digest | Sonnet | M3 | Pending |
| M5 | One round trip less in `requireMember` | Sonnet | — | Pending |
| B1 | Template guide: owner-specific text | Sonnet | — | Pending |
| B2 | Template guide: removing customers in a new product | Sonnet | — | Pending |
| B3 | `redact` in the logger | Sonnet | — | Pending |
| B4 | Empty reader sets in `createRead` | Sonnet | — | Pending |
| B5 | Pull request template and CODEOWNERS | Sonnet | — | Pending |
| B6 | Keep-alive timeout behind the host's proxy | Sonnet | — | Pending |
| Z | Delete this plan | Sonnet | all | Pending |

Suggested order: A1, A3, A2, then M1, M5, M3, M4, then M2, then the B items in one pull request.

---

## A1. Timeouts on the Postgres pool

**Model:** Opus (database decision). **ADR:** yes.

**Where:** `apps/api/src/libs/database/database.ts`, `apps/api/src/modules/health/`, `docs/operations.md`.

**Problem.** `pg.Pool` is created with no `connectionTimeoutMillis`, no `statement_timeout` and no
`idle_in_transaction_session_timeout`. With the database out of reach or a query stuck on a lock, a
request waits until Node's 300 s request timeout. Five connections are exhausted by a few stuck
requests and the whole API stalls, while `/api/health/live` keeps answering 200, so the host never
restarts it. Writes in the web have no time limit (ADR 0041): the user waits forever.

**Done when:**

- A connection attempt, a wait for a free connection and a statement each have a limit, chosen to
  survive a Neon cold start (the probe already uses 3 s; the deploy smoke test retries for about 25 s).
- A timeout ends as a 503 problem with a stable `code` the web already maps to "the server could not
  answer", not a 500 with a stack in the log.
- Tests at the lowest layer: the pool options (unit), a statement past its limit on PGlite (db
  project), the problem the pipeline answers (integration).
- The decision on liveness is written down: whether `/api/health/live` stays I/O-free (ADR 0046) and
  how a stalled pool is noticed instead.
- `docs/operations.md` gains the symptom and where to look.

## A2. Account deletion

**Model:** Opus (auth and tenancy). **ADR:** yes. **Skills:** `minimize-support`, `design-system`.

**Where:** `apps/api/src/modules/identity/infrastructure/auth.ts`, `organization-rules.ts`, emails and
their locales, `apps/web/src/pages/security/` or `profile/`, a new feature slice, `packages/contracts`,
`docs/security/threat-model.md`, `apps/e2e/tests/`.

**Problem.** A user cannot delete their account, and the threat model does not list it as an accepted
risk. It is a right of the data subject (LGPD art. 18, GDPR art. 17) and the first thing a SaaS audit
looks for.

**Done when:**

- Better Auth's `deleteUser` is on, with a confirmation the user must give (password or email link,
  decided in the ADR) and the email in every language.
- The tenancy rule is decided and enforced on the server: the sole owner of an organization with
  other members must transfer ownership or delete it first; an organization with only them goes
  with the account. Customers go with their organization (cascade already exists).
- The screen says what will be deleted before it happens, and what blocks it with the way out.
- Sessions, accounts, two-factor rows, memberships and pending invitations sent by the user are gone;
  a db test proves it.
- One end-to-end journey; the threat model gains the flow.

## A3. Concurrency control in the reference module

**Model:** Opus to decide the pattern and do the API; Sonnet may do the web half in a second session.
**ADR:** yes (amends ADR 0044, "How to copy the module").

**Where:** `apps/api/migrations/` (new migration), `apps/api/src/modules/customers/`,
`packages/contracts/src/customers.ts`, `apps/web/src/entities/customers/`,
`apps/web/src/features/customers/manage-customers/`.

**Problem.** `PUT` replaces the customer whole: when two people edit at once, the last write wins in
silence. There is no `updated_at` either. Customers is the module every new one copies, so the gap
multiplies.

**Done when:**

- A new migration adds `updated_at` (and a version, if the ADR picks one over the timestamp).
- An update states the version it read (`If-Match` or a body field, decided in the ADR); a stale one
  answers 409 with a stable `code`, and `save` checks the row it changed (a row deleted meanwhile is
  a 404, not a 200 with stale data).
- Archive, restore and delete follow the same rule, or the ADR says why not.
- The web answers a 409 by telling the user the customer changed and calling `readAgain`.
- The contract suite covers the conflict for both the fake and Kysely; ADR 0044's copy steps mention
  the column and the check.
- The ADR also records when search moves to `pg_trgm` and keyset pages (not done now).

## M1. HSTS and the remaining security headers

**Model:** Sonnet.

**Where:** `apps/web/public/_headers`, `.github/workflows/deploy.yml` (smoke test),
`docs/security/threat-model.md` (T04), `docs/using-the-template.md`.

**Problem.** T04 relies on `.dev` being HSTS-preloaded, which holds on `workers.dev` only. A product
on its own domain loses it, and the guide does not say so.

**Done when:** `_headers` sends `Strict-Transport-Security` (start without `preload`; the guide says
when to add it), `Permissions-Policy` (everything the app does not use off) and
`Cross-Origin-Opener-Policy: same-origin`; the deploy smoke test checks them; `vite preview` serves
them (it reads `_headers` already); T04 no longer depends on the domain.

## M2. Purge expired rows on a schedule

**Model:** Opus (database and deploy decision). **ADR:** yes. **After:** A1.

**Where:** `apps/api/src/` (a purge entry point beside `migrate.ts`), `apps/api/build.ts`,
`.github/workflows/`, `docs/operations.md`, `docs/security/threat-model.md`.

**Problem.** Expired rows of `session`, `verification`, `rateLimit`, expired invitations and old
unconfirmed accounts are never removed. Two accepted risks in the threat model already say "purge on
a schedule", but nothing does. Tables and indexes grow on a free tier of 0.5 GB.

**Done when:** the ADR picks where it runs (a GitHub Actions schedule, `pg_cron`, or the host's cron)
and how long each kind is kept; the purge is idempotent and tested on PGlite; it logs how many rows
it removed; the threat model's two rows point at it.

## M3. Automated dependency updates

**Model:** Sonnet. **ADR:** yes (replaces "Renovate: when the manual dependency checks slip" in the
guide).

**Where:** `renovate.json` or `.github/dependabot.yml`, `docs/using-the-template.md`.

**Problem.** Updates depend on someone running `pnpm outdated -r`. On the day of the audit Better Auth
was four patches behind. The weekly audit only catches published advisories.

**Done when:** updates are proposed automatically, grouped (dev tooling weekly, runtime patches,
Better Auth on its own so it is read first), respecting the pnpm catalog and a minimum release age;
GitHub Actions SHAs and the Docker digest (M4) are kept current too; the guide says how to review
them.

## M4. Pin the Docker base image by digest

**Model:** Sonnet. **After:** M3 (so the digest stays current).

**Where:** `apps/api/Dockerfile`.

**Problem.** Actions are pinned by SHA, but `node:26-slim` is a moving tag: the build is not
reproducible and the supply-chain stance is inconsistent.

**Done when:** both stages use `node:26-slim@sha256:…` with the tag kept beside it for reading, and
M3's configuration updates it.

## M5. One round trip less in `requireMember`

**Model:** Sonnet.

**Where:** `apps/api/src/modules/identity/infrastructure/kysely-membership.ts`,
`organization-rules.ts`, `docs/operations.md`.

**Problem.** Every tenant route reads the session, then the member's roles, then the organization's
custom roles, one after the other. The custom roles query does not depend on the roles found.

**Done when:** the two membership reads run together (or as one query), a non-member still costs no
permission work, the db tests stay green, and `docs/operations.md` says to keep the API and the
database in the same region.

## B1. Template guide: owner-specific text

**Model:** Sonnet.

**Where:** `docs/security/threat-model.md` (`*.leal32b.workers.dev`), `docs/using-the-template.md`
("Name the product"), `SECURITY.md`.

**Done when:** no document names the owner's own accounts, and the "Name the product" table lists
every place a new product must change, including the threat model and the security contact.

## B2. Template guide: removing customers in a new product

**Model:** Sonnet.

**Where:** `docs/using-the-template.md` section 5, ADR 0044.

**Problem.** The guide says to remove the module "with a new migration that drops the table". A
product never deployed should delete `0004_customers.sql` and `0006_customer_version.sql` instead; the drop migration is for one
already in production.

**Done when:** both cases are written, each with its steps.

## B3. `redact` in the logger

**Model:** Sonnet.

**Where:** `apps/api/src/libs/logging/create-logger.ts`.

**Done when:** pino redacts the paths a library error may carry (authorization, cookie and
set-cookie headers, `X-Proxy-Secret`, connection strings), proven by a test that logs such an
error; the "never logged" rule stays the first defence.

## B4. Empty reader sets in `createRead`

**Model:** Sonnet.

**Where:** `apps/web/src/shared/api/create-read.ts`.

**Problem.** The `readers` map keeps a set for every key ever read, empty or not: a long session that
pages and searches piles them up.

**Done when:** a set is removed when its last reader leaves, with a test.

## B5. Pull request template and CODEOWNERS

**Model:** Sonnet.

**Where:** `.github/pull_request_template.md`, `.github/CODEOWNERS`, `docs/using-the-template.md`.

**Done when:** the template holds the definition of done, the visual review and the ADR and threat
model reminders; CODEOWNERS is a placeholder the guide tells a product to fill.

## B6. Keep-alive timeout behind the host's proxy

**Model:** Sonnet.

**Where:** `apps/api/src/libs/http/server.ts`.

**Problem (unconfirmed).** Node closes idle keep-alive connections after 5 s. If the host's proxy
keeps them longer, it may reuse one Node just closed and answer 502 now and then.

**Done when:** the host's idle timeout is checked in its documentation; if it is longer, the server's
`keepAliveTimeout` (and `headersTimeout` above it) is set past it with a test; if not, this item is
closed with the reason.

## Z. Delete this plan

**Model:** Sonnet. **After:** every item.

**Done when:** this file is deleted before the deploy, and the work it tracked lives in the ADRs, the
threat model and the guide.
