---
name: new-module
description: >-
  Adds a tenant-scoped module (a resource with a list screen) to this monorepo by copying customers,
  or removes one: the exact file list, the order, the test that comes first in each step and the checks
  to run. Use whenever a product needs a new resource such as projects, notes or appointments.
---

# New module

Customers is the mould (ADR 0044). Copy a file, rename it, then change only what is the new
resource's own. Each step below starts with its test, as the `tdd-slice` skill says: write it, see it
fail for the right reason, then write the code. Commit after each numbered step that ends green
(Conventional Commits). The long reasons are in `docs/using-the-template.md` section 5; this file is
the order and the files.

Below, `<n>` is the singular (`note`), `<ns>` the plural (`notes`), `<Ns>` the plural in PascalCase.
Copy `customers` to the new name in every path; a file named `customer-x` (singular) becomes `<n>-x`, one
named `customers-x` becomes `<ns>-x`.
Customers has an archive, an update with a `version`, a status filter and a public route: copy only the
pieces the new module needs and delete the rest, with their tests (coverage is 100%, so a copied branch
nobody uses fails the checks). `createList` works with no `filter`.

## 0. Decide first (write the answers in your plan)

- The resource name (also the permission resource and the audit resource type), its actions
  (`read, create, update, delete` unless the module has others), what each built-in role holds.
- The audit actions each write records (`created`, `updated`, `deleted`...).
- A plan limit (`<ns>.max`) or capability, if the product charges for it. Skip otherwise.
- A public route or a background job: add them after step 8 from the guide's sections, not here.
- Anything the end user sees goes through `design-system` and `minimize-support`.

## 1. Contracts (`packages/contracts/src`)

1. Test first: `organizations.test.ts` already holds the parity test: add the resource to `statements`
   and it fails until `permissionsSchema` has it too (red), then add it there (green).
2. `<ns>.ts` + `<ns>.test.ts` (from `customers.ts`): the entity, the input, the update (with `version`),
   the list query (status, search, page) and list answer, the page size. Export them from `index.ts`.
3. `organizations.ts`: the resource in `statements`, `permissionsSchema`, and its share in each of
   `builtInRoles` (`admin`, `member`; the owner takes all). Update the tests that count or list
   permissions: `organizations.test.ts`, `apps/api/.../identity/infrastructure/organization-rules.test.ts`,
   `apps/web/src/entities/organizations/lib/members.test.ts`, and the "N of 17 permissions" texts in
   `pages/organization-roles` (grep `of 17 permissions` and `customer: ['read', 'create', 'update']`).
4. `audit.ts` + `audit.test.ts`: `<n>: [...]` in `auditActions`.
5. `billing.ts` + `billing.test.ts` only if step 0 named a limit or capability.

## 2. Migration (`apps/api/migrations`)

`00NN_<ns>.sql` (next number; plain SQL, forward only), columns and indexes from `0004_customers.sql`
(`organization_id text not null references auth."organization" ("id") on delete cascade`), and the three
row-level-security lines (`enable row level security`, `create policy tenant_isolation ... to app_tenant`,
`grant` with only the verbs the module uses) copied from `0013_subscription.sql`; `0004` has none.
Add `drop table if exists <n>` to the one long string of `apps/api/test/reset-database.ts`, before `schema_migration`. Tests that name a table without these lines:
`libs/database/tenant-row-security.db.test.ts`.
The organization export holds every tenant table: add the table to `tenantTables` in
`modules/data-export/database/export-tables.ts`, each column held or left out with why, or name it in
`notExported` (ADR 0074). Test that fails without it: `modules/data-export/database/data-export.db.test.ts`.

## 3. API module (`apps/api/src/modules/<ns>/`), in this order

1. `domain/<n>.ts` + test, `domain/<ns>.errors.ts`: pure rules and `changedFields`.
2. `<n>-repository.port.ts`, `<ns>-unit-of-work.port.ts` (with `audit: AuditTrail` and `jobs: JobQueue`), `<n>-audit.ts`,
   `<n>-response.ts` (`to<N>Response`) and `find-<n>.ts` (raises not found).
3. `testing/in-memory-<n>-repository.ts` + test, `testing/test-<ns>.ts` (the actor and the `test<Ns>()`
   factory over `InMemoryUnitOfWork`) and `testing/in-memory-<ns>-unit-of-work.test.ts`,
   `testing/<n>-repository.contract.ts` and `testing/<ns>-unit-of-work.contract.ts`; the contract
   suites run against the fake here and against Postgres in step 4.
4. `database/kysely-<n>-repository.ts` + `.db.test.ts` (runs the contract), `database/kysely-<ns>-unit-of-work.ts`
   + `.db.test.ts` (the only place that builds the adapters).
5. One service per use case, each with its test using the in-memory unit of work:
   `queries/list-<ns>/`, `queries/get-<n>/`, `commands/create-<n>/`, `update`, `delete`... Each
   write records its audit entry in the same `run`, with the actor it is given.
6. `<ns>.routes.ts` (`register<N>Routes`, through `tenantRoutes`, no controller class), `index.ts`
   exporting only that, and `<ns>.routes.integration.test.ts` (from the customers one, with
   `serveRoutes`). Then one `register…Routes(router, {...})` call and its two imports in
   `apps/api/src/app/create-app.ts`.

## 4. Web (`apps/web/src`)

1. `entities/<ns>/api/<ns>-api.ts`, `<ns>-query.ts` (+ tests) and `index.ts`.
2. `features/<ns>/manage-<ns>/` (form, the buttons that write, `model/` helpers; tests each). Only what the
   page needs.
3. Texts first, in all three languages: `shared/config/i18n/dictionaries/<ns>/{en,es,pt-BR}.ts`, then
   register the group: `lazyGroups` in `i18n/messages.ts` and the `Messages` type in `i18n/locales/en.ts`.
   Also the texts that other groups hold for the new resource, in all three languages: `team`
   (`team.resources.<n>`, `team.permissions.<n>.<action>`), `audit` (`activity.entries.<n>.<action>`,
   `activity.fields.<n>.<field>` for each field the entries name), `shell` (`appShell.nav.<ns>`,
   `appShell.palette.keywords.<ns>`); the es and pt-BR files type themselves from `./en`. The activity page
   keeps a `fieldsWithWords` map keyed by resource (`pages/organization-activity/ui/organization-activity-page.tsx`):
   add `<n>: [...]` there or typecheck fails. Delete `node_modules/.vitest-cache` at the repo root whenever
   a dictionary folder is added or removed (`dictionaries.test.ts` globs the folders).
4. `pages/<group>/<ns>/ui/<ns>-page.tsx` + test (from the customers page). `pages/` already holds as many
   slices as Steiger allows ungrouped (`fsd/excessive-slicing`): put a new page in a group folder,
   `pages/modules/<ns>/`, imported as `#pages/modules/<ns>`, with one more `../` on the test helper imports: the screen is
   `GuardedScreen` (access guard, no-access empty state, `ReadFailure`), `createList` +
   `createListStatus`, `ListToolbar`, `ListPager`, `ListSection`/`ListRow`. The test draws it with
   `renderOrganizationPage` (`apps/web/src/test-organization-page.tsx`) and a fake API.
   Cover each role's view and the empty, search and error states. `index.ts` re-exports the page.
5. The route: in `app/routes.tsx` a `lazy` import, a `preload` that asks the list's first page with
   the same arguments the page asks, and `{ path: '/<ns>', ...screenOf(<N>Page, ['<ns>'], preload) }`
   (add `'billing'` to the groups only if the page shows plan refusals). The menu item in
   `widgets/app-shell/ui/sidebar.tsx` and the entry in `shell-palette.tsx`, with an icon from
   `packages/ui` (`scripts/generate-icons.mjs` lists the names; add one there only if none fits).
   Tests: `app/app.test.tsx`, two as the customers route has them (the first page is asked as the address
   opens; none is asked at an address naming no organization of the user), and a case in
   `widgets/app-shell/ui/app-shell.test.tsx` for the menu item and palette entry. A module with no plan
   limit leaves the read-only screen state to the API's refusal and the generic alert.

## 5. End to end (`apps/e2e/tests/`)

One journey for the main path, from `first-customer.spec.ts` (`docs/testing.md`). Edge cases stay in
the layers below. Find fields with `getByRole('textbox', { name })`: `getByLabel` also matches the search box.

## Checks

After every step: the narrow test, then `pnpm lint && pnpm typecheck`. Before the last commit, the whole
definition of done from `AGENTS.md`:

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps && pnpm lint:fsd && pnpm knip && pnpm test:e2e
```

Put Node 26 first on `PATH` (`$HOME/.nvm/versions/node/v26.12.1/bin`). Coverage is 100%: a branch you
copied and do not use is a branch to delete, not to leave uncovered. A decision the module introduces
(a new kind of limit, a public surface) is an ADR: use `write-adr`.

## Removing a module

Removing a feature leaves nothing behind (`AGENTS.md`). Delete, in this order, with an ADR that says why:
the e2e journey; the page, feature and entity folders and the route, menu item and palette entry; the
dictionary group (and its `lazyGroups` and `Messages` lines) and the module's lines in `team`, `audit`
and `shell`; the API module folder and its `create-app.ts` lines; the resource from `statements`,
`permissionsSchema`, `builtInRoles`, `auditActions`; the limit or capability in `billing.ts`; the
`packages/ui` components and icons only it used. Add a migration that drops the table (forward
only: never edit an applied one) and take it out of `reset-database.ts`. Then run the checks above
and `pnpm knip`, which names what is left.
