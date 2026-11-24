# 0074. Record the terms accepted at sign-up, and export an organization by a job and a link

- Status: proposed; where the file lives is settled by [0076](0076-keep-files-in-an-s3-compatible-store-behind-a-port-reached-by-signed-urls.md)
- Date: 2026-11-19

## Context and problem statement

Sign-up records no acceptance of terms of use or of a privacy notice, the app has neither page, and
nothing gives an organization its data back. Account deletion exists
([ADR 0049](0049-delete-an-account-from-an-emailed-link.md)); access and portability are the other rights
a SaaS is asked about first (LGPD art. 18, II and V; GDPR art. 15 and 20), and "can I take my data with
me" is a buyer's question before it is a lawyer's.

Five questions:

1. How is the acceptance recorded, for an account made with a password and for one made with Google, and
   what happens when a new version is published?
2. Where do the two pages live, and where does a product put their text and version?
3. How does an owner get the organization's data: in what format, holding what, kept where while there
   is no file storage (P1-5), for how long, how often, and with what trace?
4. Is a personal export (one user's own data) in scope?
5. What does all this add to the first download, which [ADR 0071](0071-load-each-screens-dictionary-group-with-its-route.md)
   just made small?

## Decision drivers

- The record says which text was in force when the account was made, and when, whichever way it was made;
  the browser cannot write a version of its own choosing.
- Signing up stays one form and one button: no required field that only produces an error state
  (`minimize-support`), and the sign-in and sign-up keep their JavaScript budgets (ADR 0045).
- One place to change each thing: the version that both sides read, the texts a product writes.
- The export holds everything of the organization, nothing of another, and no secret; isolation is proved
  by the database, not by a `where` (ADR 0055).
- A leaked or forwarded email must not hand over an organization's data.
- Bounded cost: an owner cannot fill the database or keep a worker busy with exports.
- No new service and no new dependency; works on PGlite and any Postgres.

## Considered options

Recording the acceptance:

1. **Additional fields on Better Auth's user, stamped by the server** at creation with the version in force
   (`databaseHooks.user.create.before`), with words beside every button that makes an account.
2. Additional fields the browser sends (`input: true`), checked against the version in force.
3. A table of our own, `legal_acceptance (user_id, version, accepted_at)`, one row per acceptance.

The words at sign-up:

A. **A sentence beside the button** ("By continuing, you accept the Terms of use and the Privacy notice").
B. A required checkbox.

A new version:

i. **Notice only**: the operator tells every user before it takes effect; nothing in the app blocks.
ii. Re-acceptance on the next sign-in: a screen that blocks the app until the user accepts.

Where the export's file lives:

a. **A `bytea` column of a tenant table, served by the API behind the owner's session.**
b. A link signed with a secret (an HMAC of the export's id and its expiry), opened without a session.
c. The API's local disk.

## Decision outcome

Chosen options: **1, A, i and a.**

### Acceptance at sign-up

- **One version for the pair.** `legal.version` in `@repo/contracts` (a date, `2026-11-19`) names the
  terms and the privacy notice as they read together; a change to either is a new version. The API stamps
  it and the web prints it on both pages, from the same constant, so they cannot disagree.
- **Two additional fields of Better Auth's user** (migration `0015`), `legalVersion` and `legalAcceptedAt`,
  declared with `input: false`, so Better Auth refuses a sign-up that sends either (`400 FIELD_NOT_ALLOWED`). The hook
  `databaseHooks.user.create.before` sets both on every creation: the password form, Google's first sign-in
  (Better Auth creates the account from the sign-in as well), and an invited person signing up. Accounts
  made before this change keep both `null`: no acceptance was recorded for them.
- **Option 1 over 2.** The server knows the version in force; asking the browser for it only adds a way to
  disagree (a tab open across a deploy) and an error to explain, and Google's redirect carries no body to
  send it in. Option 3 earns its table on the day a product keeps every acceptance (option ii); a column is
  one read with the user, and the table can start from it.
- **The words (A).** The sign-up says, under its button, "By continuing, you accept the Terms of use and the
  Privacy notice", with both links, which open in a new tab so the form keeps what was typed. The sign-in says it under "Continue with Google" when Google is on,
  since that button also makes an account. A checkbox (B) proves no more about what was read, adds a field
  that can only be wrong, and cannot sit in front of Google's redirect without a step of its own. A product
  whose counsel asks for a checkbox adds it to the form; the fields and the hook stay as they are.

### A new version (i, the default)

The operator publishes the new text with a new `legal.version` and tells every user, by email, before it
takes effect (the notice period the text itself promises). Nothing in the app changes: an account keeps the
version it accepted, and `legalVersion` older than `legal.version` says who has not accepted the new one in
the app. The runbook in [operations.md](../operations.md#terms-and-privacy) says how.

Re-acceptance (ii) is what a product adds when a change needs consent rather than notice (a new purpose of
processing under LGPD art. 8, § 6, a new paid term): the session guard compares `legalVersion` with
`legal.version` and shows a screen whose button records the new version (`POST /api/me/legal-acceptance`),
and option 3's table keeps each acceptance. It is not built now: it blocks every user of a template that has
no text of its own yet.

### The two pages

`/terms` and `/privacy` are entry screens, in the entry frame, outside the session guard, reachable signed in
or not, and linked from every entry screen's footer beside the language. Their text is the dictionary group
`legal` (`apps/web/src/shared/config/i18n/dictionaries/legal/{en,es,pt-BR}.ts`), loaded with their route
(ADR 0071), so the sign-in pays nothing for it: each page is a title, the version, and paragraphs separated
by blank lines. The template's text is a placeholder that says so and lists what a product must cover; a
product replaces it, in every language it sells in, and changes `legal.version` in the same commit. `terms`
and `privacy` join the reserved slugs.

### Organization export

- **Who and how.** The owner, alone, asks in the organization's settings (General, "Export data"):
  `POST /api/organizations/:organizationId/export`, a tenant route with the new owner-only permission
  `organization:export` (beside `organization:delete` in `ownerOnlyPermissions`). Open while the
  organization is read only (`duringReadOnly`): taking one's data out is never behind a payment. The request
  writes one row and enqueues one job, `data-export.build`, in one unit of work, with an audit entry
  (`organization` / `export-requested`, the owner as actor). The job builds the file and enqueues the
  email, `exportReady`, on its own kind `data-export.send-email` (ADR 0073), to the owner who asked, in
  their language, with the day it expires in the organization's time zone.
- **The format: a zip of CSV files, one per table**, UTF-8 with a byte-order mark so a spreadsheet opens
  accents right, a header row of column names, RFC 4180 quoting, instants in ISO 8601 UTC, money in minor
  units with its currency, as the API speaks (ADR 0053). A shop owner opens it in a spreadsheet; a program
  reads it as easily as JSON. The zip is written by a small writer in `#libs/archive` on `node:zlib`
  (deflate and `crc32`), with no dependency.
- **What it holds** (`data-export/database/export-tables.ts` lists every table and column):

  | File | Rows | Not in it |
  | --- | --- | --- |
  | `organization.csv` | the organization: id, name, slug, time zone, currency, created | its `metadata` and `logo` |
  | `members.csv` | each member: user id, name, email, roles, joined | the user's sessions, sign-in methods, password hash, tokens, two-step secrets and backup codes, language |
  | `invitations.csv` | each invitation: email, role, status, expiry, inviter id, created | |
  | `roles.csv` | each custom role and its permissions | |
  | `customers.csv` | every customer, archived ones included | |
  | `activity.csv` | the audit trail, as kept (a year, ADR 0061) | |
  | `subscription.csv` | the plan, status and dates | the provider's ids, the open checkout's id and URL (the provider's references, not the organization's data) |

  The tenant tables are read in one unit of work, as `app_tenant` with the organization set (ADR 0055), so
  row-level security returns that organization's rows alone whatever a query says; the plugin's tables
  (`auth.*`), which the tenant role cannot read, are read by an identity adapter on the pool with the
  organization's id, as `KyselyOrganizationOwners` is. A database test lists every column of every table that
  has an `organization_id`, and every column of the plugin's organization tables, and fails on one that is
  neither exported nor listed as left out with its reason, so a product's new table or column cannot be
  forgotten silently or leaked by default. Another exports one organization beside a second and finds none of
  the second's rows.
- **Where the file lives (a).** One row per organization in `organization_export` (a tenant table, migration
  `0015`): who asked, when, when it was ready, when it expires, its size, and the zip in a `bytea` column.
  `GET /api/organizations/:organizationId/export` reads its state, without the file;
  `GET /api/organizations/:organizationId/export/file` answers the zip, `Content-Disposition: attachment`,
  `Cache-Control: no-store`, behind the same tenant guard and permission. The email's button opens the
  settings page, not the file: the link is no credential, so a forwarded email or a mail scanner gets a
  sign-in page. A signed link (b) is one leaked email away from a whole tenant's data, and its secret is
  one more to rotate; the local disk (c) is gone at the next deploy on Render and not shared between
  instances. **When P1-5 lands**, the job writes the zip to the file store instead of the column, the row keeps
  its key, and the file route answers with a short-lived signed URL of the store (minutes) after the same
  guard, so the guard stays the only way in; the column is dropped then.
- **Expiry and purge.** Seven days after it is ready (`exportLimits.keepDays`). The daily purge
  (ADR 0050) empties the file of every export past its expiry and keeps the row, so the page can say "expired
  on …" instead of nothing; a new request replaces the row. An organization deleted takes its row by cascade.
  So at most one file per organization rests in the database, for at most a week.
- **The rate limit.** One request per organization every 15 minutes (`exportLimits.everyMinutes`): the
  request inside that window answers `409 export_too_soon` with the instant it opens, which the page shows
  on its disabled button. The same rule replaces a request whose job failed: after 15 minutes the owner asks
  again, and the page never waits forever. The job's work is bounded by the size of one organization, and an
  organization by its plan's limits.
- **The trail.** The request is recorded in the audit trail (it is a change: a row and a job). The download
  is a `GET` and writes nothing (AGENTS.md): the API's request log keeps its route, status and time, and an
  `export downloaded` line names the organization and the member's id.
- **Pending, ready, expired.** The page reads the state as it opens, reads it again every few seconds while
  the export is pending, and says each state in one row: ask, being prepared (we email you), ready until a day
  with its size and the download, expired on a day.

### Account data

A personal export is **out of scope**, and recorded here. What the template keeps of a user beyond their
organizations' data is their name, email, language, sign-in methods and the version they accepted, all shown
on their profile and security screens; an owner's export already lists them as a member. A request for a
copy (LGPD art. 18, II) is answered by support from those rows. A product that keeps personal data of its own
(an end customer's account, a user's uploads) adds `/api/me/export` on this same pattern: a row, a job, an
email, the file behind the session.

### What it costs the first download

The sign-up and sign-in gain one sentence with two links, in the core `entry` group, and every entry
screen two links in its footer; the pages, their texts and the export's code load with their routes, and
the export's row uses an icon the set already has. The sign-in stays within its budget (73 KB). The public
page's and the first signed-in screen's budgets (ADR 0045) are raised by 1 KB, to 77 and 116 KB: both sat
exactly on their budget before this change, and the footer's links and the General route's preload of the
export tip them over the rounding.

### Consequences

- Good: every account made from now on says which terms it accepted and when, Google ones included, with no
  field to fill and no error to explain.
- Good: a product changes one constant and three text files to publish its terms, and the template's
  placeholder says it is one.
- Good: an owner takes the whole organization out in a format they can open, without asking anyone, even in
  read only; the email carries no credential.
- Good: a test refuses a new tenant table or column the export neither holds nor deliberately leaves out.
- Bad: the record is the version in force when the account was made, beside words on the screen, not a box
  the user ticked: it proves what was shown, not what was read.
- Bad: a new version needs an email to every user from outside the app, and the app does not ask anyone to
  accept it again.
- Bad: the file rests in Postgres for up to a week, in a free tier of 0.5 GB, until P1-5; and an
  organization large enough that its export takes more than a job's 60 s or a statement's 10 s (ADR 0047)
  fails, and is retried and failed again, until the export is paged.
- Bad: the download is not in the audit trail, only in the log.
- Bad: no personal export.
- Bad: two JavaScript budgets grow by 1 KB.

## Revisit when

A change of terms needs consent rather than notice (build re-acceptance and the acceptances table); counsel
asks for a checkbox; P1-5 lands (move the file to the store); an export takes more than a few seconds or a
few megabytes, or `job failed` shows `data-export.build` (page the reads, stream the zip); an owner asks who
downloaded the data (record downloads through a `POST` that hands out a one-time link); or a product keeps
personal data outside the organizations (add the personal export).
