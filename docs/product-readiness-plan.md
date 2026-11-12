# Product readiness plan

Temporary working document: what the template still needs so that a real SaaS (the worked example is
an appointment-based business, such as a barbershop or a pilates studio) starts with close to zero
platform concerns. It comes from the audit of 2026-11-10 and is deleted once every item is `Done` or
declined, as earlier plans were.

Everything here is platform: it belongs to the template, not to a product. No item adds a product
rule.

## How to use this document

- One item, one branch slice: read the item, write its ADR first where one is listed (`write-adr`),
  then build it test first (`tdd-slice`). Screens go through `design-system` and `minimize-support`.
- Update the item's **Status** in the same commit that changes it: `Todo`, `In progress`, `Done`,
  or `Declined` (with the reason, or the ADR that says why).
- A session picks the first `Todo` item whose dependencies are `Done`, unless the owner names one.
- Open questions are the owner's to answer before the item starts; write the answer under the item.
- The definition of done of [AGENTS.md](../AGENTS.md) applies to every item.

### Model per item

| Model | Used for |
| --- | --- |
| **Fable** | Decisions that shape every later module and are expensive to undo: the design and its ADR |
| **Opus** | Auth, tenancy, database and deploy work with a settled design; security-sensitive code |
| **Sonnet** | Building to a settled pattern: components, screens, texts, mechanical refactors |

Where an item names two models, the first writes the ADR and the reference slice, the second does
the rest.

## Overview

| # | Item | Priority | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [P0-1](#p0-1-transactions-across-repositories) | Transactions across repositories | P0 | Fable | | Done |
| [P0-2](#p0-2-tenant-isolation-with-a-safety-net) | Tenant isolation with a safety net | P0 | Fable | P0-1 | Done |
| [P0-3](#p0-3-organization-settings-time-zone-currency-and-money) | Organization settings: time zone, currency and money | P0 | Opus | | Done |
| [P0-4](#p0-4-background-work) | Background work | P0 | Fable, then Opus | P0-1 | Done |
| [P0-5](#p0-5-public-tenant-surface) | Public tenant surface | P0 | Fable, then Opus | P0-2 | Todo |
| [P0-6](#p0-6-subscription-of-the-tenant) | Subscription of the tenant | P0 | Fable, then Opus | P0-1, P0-4 | Todo |
| [P1-1](#p1-1-audit-trail) | Audit trail | P1 | Opus | P0-1 | Todo |
| [P1-2](#p1-2-design-system-for-product-screens) | Design system for product screens | P1 | Sonnet | | In progress |
| [P1-3](#p1-3-a-cheaper-mould) | A cheaper mould | P1 | Opus, then Sonnet | P0-1, P0-2, P1-2 | Todo |
| [P1-4](#p1-4-new-module-skill-and-product-mode) | `new-module` skill and product mode | P1 | Sonnet | P1-3 | Todo |
| [P1-5](#p1-5-file-storage) | File storage | P1 | Opus | | Todo |
| [P1-6](#p1-6-product-notifications) | Product notifications | P1 | Opus, then Sonnet | P0-4 | Todo |
| [P1-7](#p1-7-operator-back-office) | Operator back office | P1 | Opus | P1-1 | Todo |
| [P1-8](#p1-8-browser-errors-reach-the-log) | Browser errors reach the log | P1 | Sonnet | | Todo |
| [P1-9](#p1-9-staging-and-backups) | Staging and backups | P1 | Opus | | Todo |
| [P1-10](#p1-10-terms-privacy-and-data-export) | Terms, privacy and data export | P1 | Opus | P0-4 | Todo |
| [P1-11](#p1-11-split-the-dictionaries-by-slice) | Split the dictionaries by slice | P1 | Sonnet | | Done |
| [P2-1](#p2-1-idempotent-writes) | Idempotent writes | P2 | Opus | P0-1 | Todo |
| [P2-2](#p2-2-search-and-paging-at-scale) | Search and paging at scale | P2 | Sonnet | | Todo |
| [P2-3](#p2-3-installable-web-app) | Installable web app | P2 | Sonnet | | Todo |
| [P2-4](#p2-4-one-round-trip-for-the-tenant-guard) | One round trip for the tenant guard | P2 | Opus | P0-2 | Todo |
| [P2-5](#p2-5-name-the-product-in-one-place) | Name the product in one place | P2 | Sonnet | | Todo |

Suggested order: P0-1, P0-2, P0-3, P0-4, P1-2 (in parallel, it touches nothing else), P0-5, P0-6,
then P1 by need.

---

## P0: structural, expensive to retrofit

### P0-1. Transactions across repositories

- **Model:** Fable
- **Status:** Done ([ADR 0052](adr/0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md)). Deleting a customer and recording who did it is the two-write use case; the record (`customer_change`) is what P1-1 grows or replaces.
- **Finding:** no use case writes to two tables, and nothing in `apps/api/src` opens a transaction.
  The reference module shows one repository per use case, so the first use case of a product that
  needs two (an appointment and its charge, a sale and its items) has no pattern to copy.
- **Scope:** decide how a use case runs several repository calls atomically without the domain or
  the service knowing Kysely (a unit-of-work port, or a transaction the composition root hands to
  repositories). Show it in the reference module with one real use case, in the in-memory fake and
  the Kysely adapter, under the repository contract suite.
- **ADR:** yes. It must also state how the time limits of
  [ADR 0047](adr/0047-put-time-limits-on-every-database-wait.md) and a pooler in transaction mode
  behave with it.
- **Done when:** one use case of the reference module commits or rolls back two writes together,
  proven by an integration test that fails the second write; "How to copy the module" in
  [ADR 0044](adr/0044-build-customers-as-the-reference-vertical-module.md)'s successor says how.
- **Open question:** which second table gives the reference module a real two-write use case
  without adding a product rule? P1-1's audit entry is the natural candidate.

### P0-2. Tenant isolation with a safety net

- **Model:** Fable
- **Status:** Done ([ADR 0055](adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md)). Row-level security only, set by the unit of work (`run(organizationId, work)`); a pooler in transaction mode keeps the setting. It costs three more round trips per tenant request, which P2-4 now has to count.
- **Depends on:** P0-1
- **Finding:** isolation is a convention: each repository method takes `organizationId` and adds
  the `where`. The migrations define no row-level security, and no check fails when a new table's
  query forgets the filter. With modules written by AI, one missing `where` leaks another tenant's
  rows.
- **Scope:** choose the net and build it. The two candidates: Postgres row-level security with the
  organization set per transaction (it rides on P0-1, and needs a database role that is not the
  table owner), or a shared repository contract every tenant repository must pass, with a
  cross-organization case for every method. Decide whether both are worth it.
- **ADR:** yes, amending [ADR 0033](adr/0033-organizations-with-roles-in-the-database-behind-a-path-guard.md).
- **Done when:** a repository method written without the organization filter fails a check that
  runs in `pnpm test:coverage`, shown by a test that tries it.
- **Open question:** does the default host's pooled endpoint keep a `set local` inside a
  transaction? Verify against the provider's documentation before choosing row-level security.

### P0-3. Organization settings: time zone, currency and money

- **Model:** Opus
- **Status:** Done ([ADR 0053](adr/0053-keep-time-zone-and-currency-on-the-organization-and-money-in-minor-units.md)). The settings are additional fields of Better Auth's organization table.
- **Finding:** an organization has a name and a slug. There is no time zone, currency or locale
  per organization, no money type, and the only formatter is `formatDate` (date only). Scheduling
  without the organization's time zone is the classic defect; finance needs one way to hold money.
- **Scope:** time zone and currency on the organization (asked at creation with a default from the
  browser, editable in General); conventions in `@repo/contracts`: money as integer minor units
  with its currency, instants as ISO 8601 UTC, calendar dates and wall-clock times as their own
  schemas; formatters in `apps/web/src/shared/lib` for money, time and date-time, one per idea.
- **ADR:** yes.
- **Done when:** the organization's General screen edits both settings; the contracts export the
  schemas with tests; the web formats money and date-time in the three languages.
- **Open question:** store the settings in Better Auth's organization table (additional fields) or
  in a table of ours keyed by the organization id?

### P0-4. Background work

- **Model:** Fable for the ADR and the queue, Opus for the adapters
- **Status:** Done ([ADR 0056](adr/0056-run-background-work-from-a-job-table-in-postgres.md), [ADR 0057](adr/0057-send-identity-emails-through-the-job-queue.md)). A table of our own; the worker runs in the API process by default or as `dist/worker.js`. Identity's emails are its first real user.
- **Depends on:** P0-1
- **Finding:** the only scheduled work is the daily purge, run by a GitHub Actions cron
  ([ADR 0050](adr/0050-purge-expired-rows-daily-from-a-job-of-its-own.md)). Identity emails are
  sent without waiting and a failure is only logged, so a lost email is never retried. A product
  needs reminders, webhook processing and retries.
- **Scope:** a job queue in Postgres (a table read with `for update skip locked`, or an existing
  library on the same idea: compare them in the ADR), enqueued in the same transaction as the
  change that causes it (P0-1); retries with backoff and a dead-letter state; delayed jobs for
  reminders; where the worker runs on a host whose free tier sleeps. Move identity's emails onto
  it as the first user.
- **ADR:** yes, superseding the sending part of
  [ADR 0021](adr/0021-send-email-through-a-provider-neutral-port.md).
- **Done when:** an email whose provider fails once is delivered on retry, proven by an
  integration test; a job that keeps failing is visible in the log and in
  [operations.md](operations.md).
- **Open question:** a worker process of its own, or the API process polling? The free tier
  decides the default; the ADR must say what changes on a paid one.

### P0-5. Public tenant surface

- **Model:** Fable for the ADR, Opus for the build
- **Status:** Todo
- **Depends on:** P0-2
- **Finding:** every route is either Better Auth's or behind `requireActor` / `requireMember`.
  Rate limiting exists only inside Better Auth. A B2B2C product needs people who are not members
  to reach a tenant: the barbershop's client booking online.
- **Scope:** a pattern for routes that resolve an organization by slug without a session; a rate
  limiter for our own routes, per client address, on the same Postgres storage; what a public
  route may read (an explicit public projection, never the member's response); the web side: a
  route group outside `RequireSession`, with its own frame; whether the end customer is anonymous,
  identified by a one-time code, or a second kind of account.
- **ADR:** yes, with new rows in the [threat model](security/threat-model.md).
- **Done when:** the reference module exposes one public read and one public write behind the
  limiter, with an end-to-end journey for a visitor and a test for the limit.
- **Open question:** the end customer's identity. Recommended default: no account, a one-time code
  to the phone or email only when they need to see or change what they booked.

### P0-6. Subscription of the tenant

- **Model:** Fable for the ADR and the entitlements, Opus for the provider adapter
- **Status:** Todo
- **Depends on:** P0-1, P0-4
- **Finding:** there are no plans, trials, limits per plan or payment webhooks. The limits that
  exist (`organizationLimits`) are constants.
- **Scope:** a billing port, provider neutral as the email one is, with a fake for tests and the
  end-to-end suite; plans and their entitlements in code, the subscription state in the database;
  one `entitlement` check used by the API and mirrored to the web through the membership read;
  the webhook route (signature over the raw body, processed as a job, idempotent by event id);
  trial, past-due and cancelled states with what each screen says (`minimize-support`).
- **ADR:** yes, one for the port and entitlements, one for the first provider.
- **Done when:** an organization on a trial upgrades, fails a payment and recovers, in an
  end-to-end journey on the fake provider; a limit of the plan refuses a write with a problem code
  the web explains.
- **Open question:** the first provider. It must cover Pix and boleto for Brazil; compare at
  least two in the ADR.
- **Note:** entitlements are also how a product turns modules on per kind of business, so design
  them as capabilities (`group-sessions`, `commissions`), never as a plan or business name.

---

## P1: important, retrofits without pain

### P1-1. Audit trail

- **Model:** Opus
- **Status:** Todo
- **Depends on:** P0-1
- **Finding:** nothing records who changed what. Multi-user tenants and money both need it, and
  support cannot answer "who deleted this" from the request log.
- **Scope:** an append-only table per organization (actor, action, resource, time, a small diff),
  written in the same transaction as the change; a read-only screen for whoever holds the
  permission; retention in the purge job.
- **ADR:** yes.
- **Done when:** every write of the reference module leaves an entry, and the screen lists them.

### P1-2. Design system for product screens

- **Model:** Sonnet
- **Status:** In progress. Done: the `Settings*` family renamed to `List*` ([ADR 0054](adr/0054-name-the-row-family-for-lists-not-for-settings.md)) and the `Pager`. The other components wait for a screen that uses them: none is added without a user.
- **Finding:** `@repo/ui` covers settings and entry screens. It has no Dialog, data list or table,
  Tabs, Toast, Textarea, Switch, Radio, Tooltip, Combobox, date, time or money input, calendar, or
  pager. The customers list is drawn with `SettingsRow` and `SettingsSection`, and its pager is
  markup in the page.
- **Scope:** add the components a register, a schedule and a ledger need, each with tests and its
  row in the skill's table "One idea, one presentation". Start with the ones the reference module
  already fakes: a data list (or rename the `Settings*` family if it is the same idea) and a pager.
- **ADR:** only where a new idea needs a decision (calendar, toast versus inline status).
- **Done when:** the customers page holds no layout markup of its own, and each new component has
  its story in the visual review at 375×812 and desktop, light and dark.
- **Note:** one component per commit; this item is long and safe to interleave with others.

### P1-3. A cheaper mould

- **Model:** Opus for the API helper, Sonnet for the web
- **Status:** Todo
- **Depends on:** P0-1, P0-2, P1-2
- **Finding:** the reference module is 61 files and about 3,800 lines with tests. Each controller
  repeats the session, the membership and `requireMember`; the page holds about 300 lines of list
  state (search, filter, page, panels, statuses) that the next module would copy.
- **Scope:** a tenant route helper that takes the permission, the schema and the use case; a
  reusable list state for the web (filter, search, page, the page that empties); keep one use case
  per folder.
- **ADR:** amend [ADR 0006](adr/0006-api-architecture.md) if the controller class goes away.
- **Done when:** the module's line count drops measurably with the same tests passing, and a
  second throwaway module built from it in a spike needs no copied block.

### P1-4. `new-module` skill and product mode

- **Model:** Sonnet
- **Status:** Todo
- **Depends on:** P1-3
- **Finding:** the steps to copy the module live in ADR 0044 and in
  [using-the-template.md](using-the-template.md); an agent follows a skill more reliably. The
  working agreement's teaching mode (the owner creates each file) suits learning the template, not
  building a product on it with AI.
- **Scope:** a `.claude/skills/new-module` skill with the exact file list, order and checks; a
  section in `AGENTS.md` (or the guide) saying what changes when the repository becomes a product:
  who writes files, when to commit, which rules stay.
- **Done when:** a fresh session builds a small second module from the skill alone, green.

### P1-5. File storage

- **Model:** Opus
- **Status:** Todo
- **Finding:** the pipeline accepts JSON bodies up to 1 MB and nothing else, by design. There is
  no place for a logo, an avatar, an attachment or a receipt.
- **Scope:** a storage port (S3-compatible behind it, a local folder in development and tests);
  uploads go straight to storage with a signed URL the API issues after `requireMember`; downloads
  the same way; size and type limits; what deleting an organization removes. The organization's
  logo is the first user.
- **ADR:** yes, with threat model rows.
- **Done when:** an organization uploads and replaces its logo, in an end-to-end journey.

### P1-6. Product notifications

- **Model:** Opus for the port, Sonnet for the texts
- **Status:** Todo
- **Depends on:** P0-4
- **Finding:** email texts and `writeEmail` live inside `modules/identity`, so another module
  cannot send an email without importing identity's internals. There is no channel but email.
- **Scope:** move the writing of emails to a shared place modules can use, with their own texts
  per language; a second port for short messages (WhatsApp or SMS), provider neutral, logged in
  development; the recipient's language and the organization's time zone (P0-3) in every text.
- **ADR:** yes.
- **Done when:** the reference module sends one email through the queue with a test, and the
  short-message port has a logging adapter and a recorder for tests.

### P1-7. Operator back office

- **Model:** Opus
- **Status:** Todo
- **Depends on:** P1-1
- **Finding:** the people who run the SaaS have no screen: finding a tenant, its plan or its
  owner means a SQL console. `admin` is already a reserved slug.
- **Scope:** an operator role outside organizations; screens to find organizations and users and
  see their state; impersonation with a visible banner, a time limit and an audit entry.
- **ADR:** yes, with threat model rows: this is the most privileged surface of the product.
- **Done when:** an operator finds an organization and enters it as its owner, and the owner's
  audit trail shows it.

### P1-8. Browser errors reach the log

- **Model:** Sonnet
- **Status:** Todo
- **Finding:** an exception in the browser reaches nobody. Error tracking waits for a trigger
  ([ADR 0046](adr/0046-observe-through-structured-logs-tagged-with-the-release.md)), which is fine
  for the API, whose errors are logged, and leaves the web blind.
- **Scope:** an error boundary and the `error` / `unhandledrejection` handlers post a small report
  (message, stack, route pattern, release, never user data) to an API route that logs it, rate
  limited; the screen shows the same support reference the API failures show.
- **ADR:** amend ADR 0046.
- **Done when:** a thrown error in a screen leaves one log line with the release, in a test.

### P1-9. Staging and backups

- **Model:** Opus
- **Status:** Todo
- **Finding:** the deploy has one environment, `production`. There is no place to try a migration
  on real-shaped data, and the runbook does not say how to restore the database.
- **Scope:** a second environment the same workflow deploys (a branch of the database, a second
  service and Worker), documented as optional; a restore section in
  [operations.md](operations.md), rehearsed once, with the provider's point-in-time limits.
- **ADR:** amend [ADR 0014](adr/0014-hosting-and-deploy-from-github-actions.md).
- **Done when:** the guide's deploy section covers staging, and the restore was done once and
  timed.

### P1-10. Terms, privacy and data export

- **Model:** Opus
- **Status:** Todo
- **Depends on:** P0-4
- **Finding:** sign-up records no acceptance of terms or of a privacy policy, and nothing exports
  an account's or an organization's data. Account deletion exists
  ([ADR 0049](adr/0049-delete-an-account-from-an-emailed-link.md)).
- **Scope:** acceptance at sign-up with the version accepted and when; placeholder pages a product
  fills in; an export an owner requests and receives by link, built as a job.
- **ADR:** yes.
- **Done when:** a new account stores what it accepted, and an owner downloads the organization's
  data in an end-to-end journey.

### P1-11. Split the dictionaries by slice

- **Model:** Sonnet
- **Status:** Done ([ADR 0058](adr/0058-split-the-i18n-dictionaries-by-slice-and-merge-them-per-language.md)). One file per group and language, merged per language; loading texts with the route was rejected at this size.
- **Finding:** each language is one file of about 790 lines. Every screen of a product edits the
  same three files, which grow to thousands of lines and collide between sessions.
- **Scope:** one dictionary per slice, merged with types kept, loaded with the slice's code; the
  guide says how to remove a language a product does not sell in.
- **ADR:** amend [ADR 0011](adr/0011-typed-i18n-dictionaries.md).
- **Done when:** the customers texts live beside the customers slices and load with them; the
  bundle budget test still passes.

---

## P2: when a trigger appears

### P2-1. Idempotent writes

- **Model:** Opus
- **Status:** Todo
- **Depends on:** P0-1
- **Trigger:** the first write that moves money.
- **Finding:** writes have no time limit on the web because one may have happened though its
  answer is late ([ADR 0041](adr/0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)); a
  retry of a payment must not charge twice.
- **Scope:** an `Idempotency-Key` header the web sends per form submission, stored with the
  answer for a day, purged by the daily job.

### P2-2. Search and paging at scale

- **Model:** Sonnet
- **Status:** Todo
- **Trigger:** an organization with tens of thousands of rows in one list, or a list that grows
  without end.
- **Finding:** the list searches with `like '%…%'` over three columns, which no index serves, and
  pages by offset. Both are right for a register, as ADR 0044 says.
- **Scope:** a `pg_trgm` index for the search; a keyset variant of the list for feeds.

### P2-3. Installable web app

- **Model:** Sonnet
- **Status:** Todo
- **Trigger:** a product used mostly on a phone at the counter.
- **Finding:** no web app manifest. Offline is out of scope.
- **Scope:** manifest, icons and theme colours from the tokens; the `Content-Security-Policy` and
  `_headers` entries it needs.

### P2-4. One round trip for the tenant guard

- **Model:** Opus
- **Status:** Todo
- **Depends on:** P0-2
- **Trigger:** tenant routes whose latency is dominated by the guard.
- **Finding:** a signed-in tenant request makes two sequential database round trips before its
  own query (the session, then the membership), as [operations.md](operations.md) notes. The
  session cache is off on purpose.
- **Scope:** read the session and the membership in one query, without bringing the cache back.

### P2-5. Name the product in one place

- **Model:** Sonnet
- **Status:** Todo
- **Trigger:** the next product started from the template.
- **Finding:** the guide lists nine places to rename by hand, among them a string inside
  `auth.ts` (`twoFactor({ issuer: … })`).
- **Scope:** one product constant the API and the web read, and a script or checklist test that
  fails while the template's name remains.

---

## Beyond the template: one product, several kinds of business

Not work for this repository; recorded so the items above are designed for it.

- A barbershop and a pilates studio are one product: a service business with a schedule. Shared
  modules: customers, catalogue, staff, scheduling, sales, finance, memberships and packages,
  online booking, reminders. The difference is a capability (group sessions with attendance,
  commissions), not a codebase.
- The kind of business is a setting of the organization: its words (customer or student, service
  or class), its capabilities (P0-6's entitlements) and the data its onboarding seeds. The domain
  never asks for the kind by name.
- A new repository only when the centre of the domain changes (a business with no schedule).
- A product keeps the template as a git remote to receive its changes; a repository created with
  "Use this template" starts without the shared history, so the first merge needs
  `--allow-unrelated-histories`. Say so in the guide when the first product starts.
