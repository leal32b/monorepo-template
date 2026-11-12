# 0061. Keep one append-only audit trail per organization

- Status: accepted
- Date: 2026-11-12

Replaces the `customer_change` table of [ADR 0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md)
("The reference use case: deleting a customer leaves a record") and of
[ADR 0059](0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md) (the visitor's
registration). The rest of both stands.

## Context and problem statement

Nothing recorded who changed what, except `customer_change`, which the reference module wrote for a
deleted customer and for a visitor's registration. An organization with several members, and any
product that moves money, needs to answer "who did this, and when"; support cannot answer it from the
request log, which keeps no actor per record and goes after a few days.

What is the one place every module writes its history to, what does an entry hold (above all, what
of a person's data it may keep), how is it kept from being rewritten, how long does it live, and who
reads it?

## Decision drivers

- An entry exists if and only if its change does: same transaction, same unit of work (ADR 0052).
- History cannot be rewritten from any request path, whatever the code of a module says.
- Deleting a customer for good removes their personal data; the trail must not keep it alive.
- One thing for a module to copy: a port and one call per write, with no table of its own.
- The trail grows without end: its read pages by a keyset, and the purge bounds it.
- Room for actors that are not members: a visitor (ADR 0059) now, the system or a job, an operator
  (P1-7) later.
- Holds on any Postgres, under the row-level security of [ADR 0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md).

## Considered options

1. One table, `audit_entry`, for every module, with a row per change and the organization on it;
   `customer_change` folded into it.
2. A history table per module (`customer_change`, `appointment_change`, …), each with its own shape.
3. Triggers on each tenant table that write the old and new row to a history table.
4. Entries enqueued as jobs (ADR 0056) and written by the worker.

## Decision outcome

Chosen option: 1. One table answers "what happened in this organization" in one read, a module adds
codes and not a table, and the same rules (append only, no values, retention) hold for all of it.

- **Option 2** gives a screen per module and no single trail; each module would repeat the policy,
  the purge and the paging, and a product's "activity" screen would union them.
- **Option 3** sees every column, so it keeps exactly what this record forbids (the values), and it
  does not know the actor: the request's member is not in the database session, and setting it there
  for every statement is a second channel beside the unit of work.
- **Option 4** loses "if and only if": the job is written in the transaction, but the entry exists
  only once the worker runs, and a crash between leaves a change without its trail for a while.

### The table

Migration `0012_audit_entry.sql`:

| Column | What it holds |
| --- | --- |
| `id` | The entry's id, drawn by the use case. |
| `organization_id` | The tenant, `references auth."organization" on delete cascade`. |
| `at` | The instant of the change (`timestamptz`, the use case's clock). |
| `actor_kind` | `member`, `visitor` or `system`. |
| `actor_id` | The member's user id; null for a visitor and the system, which have none (a check holds both). No foreign key: the entry outlives an account deleted later ([ADR 0049](0049-delete-an-account-from-an-emailed-link.md)). |
| `resource_type` | A stable code: `customer`. |
| `resource_id` | The record's id, never a natural key such as an email. |
| `action` | A stable code: `created`, `updated`, `archived`, `restored`, `deleted`. |
| `fields` | `text[]`: the names of the fields the change set, never their values. |

An index on `(organization_id, at desc, id desc)` serves the read. The codes are checked by the
contract (`auditEntrySchema` in `@repo/contracts`), not by the table: a module adds its codes in one
place, and the web translates each pair (`customer.deleted`) in the three languages.

`customer_change` is **moved and dropped** in the same migration: its rows are ids, an actor and an
instant, already within the rule below, and they are the answers to "who deleted this" that the trail
exists to keep. Dropping them would erase history a member may still ask about; keeping both tables
would leave two places to read. The move maps `deleted` and `created` to the same codes, the actor as
it was, and `fields` empty.

### What an entry may hold

**Ids, codes and field names; never a value.** A module follows these rules when it records:

- `resource_id` is the record's own id (a random id), never what identifies a person (email, phone,
  name, document number).
- `fields` lists the names the contract uses (`name`, `email`) of what the change set: for a create,
  the fields filled; for an update, the fields whose value differs; empty for a state change (archive,
  restore, delete). Never the old or new value, never free text typed by a person.
- Nothing else: no request body, no IP address, no user agent.

So when a customer is deleted, what stays of them in the trail is a random id that no longer points
at anything, and "Ada deleted a customer at 10:04". That is the cautious default: it answers who and
when without becoming a second copy of the data. A product that must show values (a price change, a
status from one value to another) adds them for that field only, for data that is not personal, and
says so in its own ADR.

### Append only, in fact

Under row-level security the tenant role may insert and select, and nothing else:

```sql
alter table audit_entry enable row level security;
create policy tenant_read on audit_entry for select to app_tenant
  using (organization_id = current_setting('app.organization_id', true));
create policy tenant_append on audit_entry for insert to app_tenant
  with check (organization_id = current_setting('app.organization_id', true));
grant select, insert on audit_entry to app_tenant;
```

There is no `update` or `delete` grant, so any request path, inside the unit of work where every
tenant use case runs, is refused by Postgres (`42501`) if it tries; a database test proves it. The
port has `record` and `list` and no way to change an entry, and the adapter keeps no method that
would.

Who deletes:

- **The purge**, by retention, as the tables' owner on the pool (ADR 0050).
- **Deleting the organization** deletes its trail (`on delete cascade`): the organization's records go
  with it, so must the history of them. A trail of the deletion itself belongs to whoever performed it
  outside the organization: an operator's back office (P1-7) keeps its own.
- Nobody else. Deleting an account leaves its entries: the actor's id stays, and the screen says "a
  former member".

### How a module writes an entry

- **Port** `AuditTrail` (`#libs/ports/audit-trail.port`): `record(entry)` and `list(organizationId,
  page)`. Kysely adapter `#libs/database/kysely-audit-trail`, in-memory fake
  `#libs/adapters/in-memory-audit-trail` (with `snapshot()`), one contract suite run by both. It sits
  in `libs/` beside the job queue: every module uses it and it knows no module.
- **In the unit of work.** A module adds `audit: AuditTrail` to its repositories and binds
  `new KyselyAuditTrail(transaction)` in its unit of work. A use case records inside the same `run` as
  the change, after the change succeeded, so the entry commits or rolls back with it.
- **Every write records**, so every write of the customers module now runs two statements in `run`:
  create, update, archive, restore, delete and the visitor's registration.
- **The actor** is an argument of the use case: `AuditActor = { kind: 'member'; id } | { kind:
  'visitor' } | { kind: 'system' }`. A member's controller passes `{ kind: 'member', id:
  member.userId }` from the guard; the public registration passes `visitor`; a job passes `system`.
  An operator (P1-7) adds `{ kind: 'operator'; id }` to the union, the table's check and the screen's
  texts. The domain stays pure: it says which fields differ (`changedFields`), the use case builds the
  entry.

### Retention

`auditRetention = { days: 365 }` in `kysely-audit-trail.ts`; the daily purge deletes older entries in
batches, as its other lines do, and logs how many went. A product changes the constant when its rules
ask for more (accounting, health) or less; it is the product's decision, not each organization's, so
it is not a setting. A year answers the questions support gets ("who deleted this last month") and
keeps the table bounded at a size the index serves.

### The read

- **Permission:** a new resource `audit` with one action, `read`, in `statements`. The owner and the
  admin hold it; the built-in member does not. It shows in the role editor ("Activity: see the
  activity log"), so a custom role may grant it.
- **Route:** `GET /api/organizations/:organizationId/audit-entries?before=<cursor>`, behind
  `requireMember(…, { audit: ['read'] })`, in a module of its own, `modules/audit`.
- **Paging by keyset**, newest first, 25 a page, as ADR 0044 said a feed would: the cursor is the
  last entry's `(at, id)`, opaque to the web; there is no total, since counting a table that grows
  without end costs more than the page. The web keeps the cursors of the pages it has seen, so the
  same `Pager` moves back and forward and says "Page 2" instead of "Page 2 of 9". Entries of the
  same millisecond follow their ids, which are random: their order among themselves means nothing,
  and a test must not rely on it.
- **Names.** The tenant role cannot read the `auth` schema, so the read runs in the unit of work and
  then, after `run` returns, asks identity's `Membership.namesOf(organizationId, ids)` on the pool for
  the names of the actors who are members now. One extra query per page. A member who left, or
  whose account was deleted, comes back without a name and the screen says "a former member"; a
  visitor and the system have their own texts.
- **Filters:** none now. One organization's trail at the template's scale reads newest first; the
  first filter worth adding is by record (a customer's own history, from its screen), with an index
  on `(organization_id, resource_type, resource_id, at)`, when a product has a record screen to put it
  on.

### How to copy the module, with its audit entries

This adds to "How to copy the module" of [ADR 0044](0044-build-customers-as-the-reference-vertical-module.md)
and [ADR 0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md):

- Every command of a module takes an `AuditActor` and records one entry in the same `run` as its
  change; it copies `UpdateCustomerService` (a read, a change, a save, an entry) or
  `CreateCustomerService` (two writes and no read).
- The module's unit of work offers `audit: AuditTrail`; it has no history table of its own.
- Its resource and actions join `auditActions` in `@repo/contracts`, and their texts the `audit`
  group of the web's dictionaries.
- Removing a module leaves the trail: its entries stay as history until the purge, or a migration
  deletes its `resource_type`. [docs/using-the-template.md](../using-the-template.md) has the steps.

### Threat model

Rows T44 to T46 of [docs/security/threat-model.md](../security/threat-model.md): a member who erases
or rewrites traces of what they did (refused by the grant); the trail as a second copy of a deleted
person's data (ids and field names only); and reading or growing the trail without bound (the
permission, the purge, the keyset).

Sources: [Postgres row security policies, per command](https://www.postgresql.org/docs/current/sql-createpolicy.html),
[Postgres privileges](https://www.postgresql.org/docs/current/ddl-priv.html),
[OWASP Logging Cheat Sheet, data to exclude](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude).
Read on 2026-11-12.

### Consequences

- Good: every write of the reference module leaves an entry in its own transaction, proven on the
  fake and on Postgres, rollback included; a module adds codes, not a table.
- Good: no request path can change history; Postgres refuses it, not a convention.
- Good: deleting a customer still removes their personal data; the trail keeps who and when.
- Good: removing the customers module no longer removes a table of its own: its entries stay as
  history until the purge, or a migration deletes `resource_type = 'customer'`.
- Bad: an entry says "Ada edited a customer: email", not which customer by name nor what the email
  was; a product that needs more adds it per field, with an ADR.
- Bad: every write is one more statement, and the read one more query on the pool for the names.
- Bad: the codes are checked by the contract, not by the table; a module that records a code the
  contract does not list makes the read fail for that page until it is added.
- Bad: the owner role on the pool (migrations, the purge, a future back office) can still change
  entries; only the tenant path is locked (ADR 0055's accepted risk).
- Bad: a year is a guess; a product under a legal retention duty must set its own.

## Revisit when

A product needs values in the trail (money, a status), a per-record history screen, or a retention
set per organization; the purge's audit line deletes more rows a day than the others together (the
table is the database's largest); or the operator back office (P1-7) adds its actor kind.
