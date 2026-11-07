# 0044. Build customers as the reference vertical module

- Status: accepted
- Date: 2026-11-07

## Context and problem statement

Phase 7 adds the first tenant-scoped module, the mould every later module of a product copies:
contract, domain, repository port with an in-memory fake, database adapter, use cases, HTTP routes, web
screens. The template must not carry a product's rules, so the module has to be something every B2B SaaS
has, small enough to read in one sitting, and rich enough to show each layer doing its job.

Which entity is the reference, and what does it show?

## Decision drivers

- Useful as it stands in most SaaS built from the template, so a product renames it instead of deleting it.
- Shows what the layers are for: a rule in the domain, a uniqueness the database holds, a state change,
  a filtered and paged read, a permission in the roles ([ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md)).
- No product rule of the reference repository and no feature the plan did not list.
- Deleting an organization leaves nothing behind.

## Considered options

1. Customers: name, optional email, phone, company and notes; unique email per organization; archive
   and restore; delete only once archived.
2. Projects: a name and an archived state. Universal, but with less to show (no optional contact data,
   no uniqueness worth a column).
3. API keys. Common, but a secret shown once and hashed is a security module, not a small mould.
4. Tags. The smallest, too small to be a mould.

## Decision outcome

Chosen option: "1". A customer register is the commonest tenant-scoped CRUD, and its few rules each
land in one layer:

- **Contract** (`@repo/contracts`): one input schema for `POST` and `PUT` (an edit is the form's values);
  a blank optional field reads as none, so a cleared field needs no special case in the web; the id,
  the organization and the dates are never the client's to choose (`strictObject`).
- **Permissions**: a `customer` resource with `read`, `create`, `update` and `delete`. The owner and the
  admin hold all; the built-in `member` reads, creates and edits, and cannot delete.
- **Tenant**: every route sits under `/api/organizations/:organizationId/customers` behind `requireMember`.
  The table references `auth.organization` with `on delete cascade`, which is the cleanup a deleted
  organization needs (Phase 6.5's `beforeDeleteOrganization` hook has nothing to add).
- **Routes belong to the module**: `registerCustomerRoutes` (exported by the module's `index.ts`) builds the
  use cases from the ports it is given, so the composition root passes ports and a module is one unit to
  copy; `app/http-routes.ts` keeps only the platform's and identity's routes. Updates are `PUT` with the
  whole customer; archive and restore are `POST .../archive` and `.../restore`.
- **Delete is two steps**: archive, then delete. A mistaken click costs a restore, not the record.
- **Reads** are paged by page number, 25 a page, with the total, a search and an active or archived filter.
  Offset paging is enough for a register; a feed that grows without end would use a keyset.

End to end for this phase means the API through the real pipeline and a Postgres (PGlite) in an
integration test, and the web by component tests; the browser flow belongs to Phase 8's Playwright.

### How to copy the module

A product renames `customer` and drops what it does not need. The pieces, top to bottom:

- `packages/contracts/src/customers.ts`: the schemas, and the resource in `statements`
  (`organizations.ts`) with the built-in roles' share of it, and its texts in the role editor.
- `apps/api/src/modules/customers/`: `domain/` (pure rules and errors), `customer-repository.port.ts`,
  `testing/` (the in-memory fake and the contract suite both repositories pass), `database/` (the
  Kysely adapter), `commands/` and `queries/` (a service and a controller per use case),
  `customers.routes.ts` and `index.ts`; the migration `apps/api/migrations/0004_customers.sql`; one line
  in `app/create-app.ts`.
- `apps/web`: `entities/customers` (reads as router queries, writes), `features/customers/manage-customers`
  (forms), `pages/customers`, the route and its `preload` in `app/routes.tsx`, one item in the side menu
  and the palette, the `customers` texts in every language.

Checked on 2026-11-07: Kobalte 2 is still alpha (2.0.0-alpha.4) and Solid 2 a release candidate, so the module
is built on Solid 1 and moves with the rest when they do.

### Consequences

- Good: a product copies the module and renames it; every layer has a worked, tested example.
- Good: nothing outside the module changes but the `customer` statements and their texts.
- Bad: every product carries a customers module it may not want; removing it follows the
  "removing a feature" rule of AGENTS.md (entity, texts, fixtures, and the roles' texts).
- Bad: adding the resource to `statements` adds a group to every organization's role editor.

## Revisit when

A product built from the template removes the module as its first act, which would mean the mould
should be a generic scaffold and not a real entity.
