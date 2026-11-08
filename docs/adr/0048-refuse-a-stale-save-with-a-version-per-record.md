# 0048. Refuse a stale save with a version per record

- Status: accepted
- Date: 2026-11-08

## Context and problem statement

`PUT .../customers/:id` replaced the customer whole. When two people edited it at once, the last
save won and the first person's changes vanished without a word. The table had no `updated_at`
either, and `save` did not check that it changed a row: a customer deleted meanwhile answered 200
with what the client sent. Customers is the module every new one copies
([ADR 0044](0044-build-customers-as-the-reference-vertical-module.md)), so the gap would repeat in
every module of a product.

How does a save know the record is still the one the user read, and what does the user see when it
is not?

## Decision drivers

- No change is lost in silence; a conflict is said in words, and the screen shows the newer record.
- The database is the judge, as the unique index is for an email: no window between a check and a
  write.
- Works on any Postgres and with the in-memory fake alike (the contract suite runs on both).
- One rule a new module copies without thinking, and that the web sends without a new mechanism.

## Considered options

1. An integer `version` per row, sent back in the `PUT` body; the update matches it in its `where`
   and raises it by one.
2. The same check on `updated_at`.
3. `If-Match` with an `ETag` header instead of a body field.
4. Merge per field (a `PATCH` of what changed).

## Decision outcome

Chosen option: 1, because an integer compares exactly (a JavaScript `Date` keeps milliseconds,
Postgres microseconds, so a timestamp read back may never match), and a body field lives in the Zod
contract with the rest of the request, so the web needs no header handling and no CORS exposure of
`ETag`.

- **Schema** (migration `0006_customer_version.sql`): `version integer not null` (1 on create) and
  `updated_at timestamptz not null` (an existing row takes its archive day or creation day). Both are
  in the response.
- **Contract:** `customerUpdateSchema` is `customerInputSchema` plus `version`; `POST` is unchanged.
- **Domain:** `updateCustomer(customer, details, { version, now })` refuses an older `version` with
  `CustomerChangedException` (409 `customer_changed`); every change stamps `updatedAt`.
- **Repository:** `save(customer)` updates `where id, organization and version = customer.version`,
  sets `version + 1` and returns the saved row. No row matched means the customer was deleted
  (`CustomerNotFoundException`, 404) or saved since (`CustomerChangedException`). `remove(customer)`
  deletes under the same check. The version is checked before the email, since the conflicting email
  may be the other save's.
- **Archive, restore and delete** take no version from the client: they carry no details to
  overwrite, and the state rules already answer a stale request (`customer_already_archived`,
  `customer_not_archived`). The server still saves them under the version it just read, so a request
  racing another between the read and the write is refused, and each raises the version, so an edit
  opened before an archive is refused too.
- **Web:** the edit form sends `version` with the values. A 409 `customer_changed` closes the panel,
  says "Someone changed this customer first. The list is up to date now." below the section, and calls
  `readAgain` on the list, as the archive and delete conflicts already do.

### Search and paging: not now

The list keeps `lower(...) like '%text%'` and offset pages. Move search to `pg_trgm` (a GIN index on
the searched columns) when an organization's search reads more than a few thousand rows or its p95
passes about 100 ms in the API log; move to keyset pages (`(lower(name), id) > (…)`) when someone
pages past the first hundred pages or the list becomes a feed that grows without end.

### Consequences

- Good: two people editing at once cannot overwrite each other; the second one is told and sees the
  newer record.
- Good: a write to a row deleted meanwhile is a 404, never a 200 with stale data.
- Good: a module copied from customers gets the column, the check and its tests in the copy.
- Bad: the second person retypes their change after reading the newer record; the form does not merge.
- Bad: one more query when a write matches no row (to tell "gone" from "changed"), only on the
  failure path.

## Revisit when

People lose work to conflicts often enough to complain (merge per field, or show both versions), or
a module needs writes that do not conflict, such as counters (update in place, without a version).
