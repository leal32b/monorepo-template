# 0065. Declare a module's tenant routes through one helper, without controller classes

- Status: accepted
- Date: 2026-11-12

Amends [ADR 0006](0006-api-architecture.md): a use case's folder no longer holds an
`http-controller.ts`. Amends [ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md):
a module reaches the tenant guard through this helper, not `requireMember`. Amends "How to copy the
module" of [ADR 0044](0044-build-customers-as-the-reference-vertical-module.md), as extended by
[0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md) and
[0061](0061-keep-one-append-only-audit-trail-per-organization.md). It also says where the checks of
[ADR 0063](0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md)
land.

## Context and problem statement

ADR 0006 gives each use case a folder with its service and its HTTP controller. In the reference
module, the eight controllers and the routes file held 291 lines. Every tenant controller repeated the
same steps:

- a class holding the session, the membership and its service;
- the organization's id, read from the path;
- `requireMember`, with both ports and a permission;
- the body or the query, parsed with the contract schema;
- the member, turned into the audit actor;
- the answer, sent with a status.

Only the permission, the schema, the call and the status differed. The next module would copy that
block once per use case (P1-3 of the product readiness plan).

ADR 0063 is accepted but not yet built. It adds two checks to tenant writes: refuse a write while the
organization is read only, and gate a write on an entitlement. With a controller per use case, those
checks would either repeat in each controller or hide in `requireMember`, where a route cannot say
that it serves billing.

How does a module declare a tenant route with only what differs, keep one use case per folder, and give
ADR 0063's checks one place?

## Decision drivers

- A route is declared, not written: its path, its permission, its input schema, its use case and its
  status.
- No tenant route runs without the guard, and every tenant path starts with the organization
  (ADR 0033).
- What every tenant route checks lives in one place, now and once ADR 0063 is built.
- Each use case stays one folder, with its service and its unit test (ADR 0006).
- The same behaviour is proven by the same HTTP tests.
- Plain functions: no framework, no decorators, no container.

## Considered options

1. Keep the controller classes, and move the guard and the parsing into a base class or a shared
   function.
2. A handler factory, `tenantRoute(guard, spec, run)`, that returns a handler for
   `router.post(path, …)`, as `publicRoute` does.
3. A route builder bound to the router, `tenantRoutes(router, guard)`, whose `get`, `post`, `put` and
   `delete` each take the path, the spec and the use case.
4. A route table per module: an array of route objects, or routes generated from an OpenAPI document.

## Decision outcome

Chosen option: "3".

- **Option 1** keeps a file and a class per use case, and each controller still builds the actor and
  sends the answer.
- **Option 2** removes the classes, but the handler sees neither the path nor the method when the
  route is declared. The path's parameters stay untyped (`params.customerId as string` in every
  route), nothing checks the tenant prefix, and ADR 0063's read-only rule has to read each request's
  method.
- **Option 4** is option 3 written as data. It brings more machinery and gains nothing at this size.

### The helper

`tenantRoutes(router, guard)` lives in `modules/identity/tenant-route.ts` and is exported from
`#modules/identity/index`:

```ts
const tenant = tenantRoutes(router, deps)
tenant.put(
  `${base}/:customerId`,
  { permission: { customer: ['update'] }, input: customerUpdateSchema },
  ({ organizationId, params, input, actor }) => update.execute(organizationId, params.customerId, input, actor)
)
```

- **The spec** has three fields:
  - `permission` is required; `{}` lets any member through.
  - `input` is a contract schema. A `get` reads it from the query string, any other method from the
    JSON body. Without it, nothing is read.
  - `status` is 200 unless the route says 201 or 202.
- **Each request** runs these steps, in this order:
  1. the tenant guard, with the route's permission (401, 404 or 403, as ADR 0033 says);
  2. the input, checked against its schema (a 400 that names each wrong field);
  3. the use case;
  4. the answer.

  The guard comes first, so a caller without the right learns nothing from the validation.
- **The use case is handed:**
  - `organizationId`, the id the guard confirmed. It is the only id a use case may pass to
    `unitOfWork.run` (ADR 0055).
  - `input`, typed by the schema.
  - `params`, with only the names the path declares.
  - `actor`, `{ kind: 'member', id }` (ADR 0061).
- **The answer** is what the use case returns, as JSON with the status. A use case that returns
  nothing answers 204, with no body.
- **The compiler checks two things:** a path starts with `/api/organizations/:organizationId/`, and
  `params.x` compiles only when the path names `:x`.

### The controller class goes

- The customers and audit modules no longer have `<use-case>.http-controller.ts` files. A use case's
  folder holds its service and its test.
- `<module>.routes.ts` is the module's HTTP edge. It builds the services from the ports the
  composition root gives it, and declares each route. The customers module declares its seven tenant
  routes and its public one there.
- The public route keeps `publicRoute` (ADR 0059), declared in the same file with its handler inline.
- A route that needs more than the schema gives keeps that step as a small function in the routes
  file, called from the use-case callback. The audit trail's cursor is the example: it is decoded
  there, and a cursor this API did not write is a 400.
- The platform's routes keep their controllers: identity's session routes (`/api/me`, the account
  deletion, the invitation, the identity options, and `GET …/me`, which answers with the membership
  itself), the public profile, health and Better Auth. They are the platform, not the mould, and none
  has a tenant route's shape.
- Identity's `index.ts` no longer exports `requireMember`. A product module reaches the tenant guard
  only through `tenantRoutes`. Identity's own `GET …/me` still calls `requireMember` directly.

### Tests

- Each use case's service keeps its unit test, unchanged.
- A module's routes are still tested on the real pipeline. `serveRoutes`
  (`#modules/identity/testing/serve-routes`) serves them with fakes of the guard's ports and a memory
  logger, and closes the server when the test ends. Each route test used to copy about 40 lines of
  this setup; it is now written once.
- `tenant-route.integration.test.ts` proves the helper once: the order of the guard and the input,
  both input sources, the parameters, the statuses, and the two refusals at compile time.

### Where ADR 0063 lands

ADR 0063 puts the read-only refusal in `requireMember`, by the request's method, with
`requireMember(…, { duringReadOnly: true })` for billing's routes. It also has a controller pass an
entitlement's limit to its use case. With this record, all three checks land in `tenant-route.ts` and
its test, and in no module:

- **Read only.** After the guard, the handler built by `tenantRoutes` refuses a route declared with
  `post` or `put` with `403 subscription_read_only` while `member.subscription.access` is `read-only`,
  unless the route's spec says `duringReadOnly: true`. Routes declared with `get` or `delete` pass.
  It refuses the same requests as ADR 0063's rule: the only other caller of `requireMember` is
  identity's `GET …/me`, a read, and Better Auth's routes pass through neither. The opt-out sits in
  the route's spec, beside its permission.
- **Capabilities.** The spec gains `entitlement`, a capability key. After the permission, the handler
  checks it with `entitlement(member, key)` from `@repo/contracts` and refuses with
  `403 plan_required`. Identity still imports nothing from billing.
- **Limits.** The request handed to the use case gains `member`. The route passes
  `entitlement(member, 'customers.max')` to the use case, as it passes `actor`, and the use case counts
  inside its own `run`.

### How to copy the module, with the helper

This replaces "a service and a controller per use case" in "How to copy the module" of ADR 0044:

- `commands/<use-case>/` and `queries/<use-case>/` each hold a service and its test.
- `<module>.routes.ts` exports `register<Module>Routes(router, deps)`, with `deps` typed
  `TenantGuard & { …the module's ports }`. It builds each service once. Then it declares each route
  with `tenantRoutes(router, deps)`: the method, the path under `/api/organizations/:organizationId/`,
  the permission, the input schema, the status when it is not 200, and the call to the use case.
- `<module>.routes.integration.test.ts` serves the routes with `serveRoutes`. It covers the refusals
  of the module's permissions and each route's main path. What the helper itself does is proven once,
  in identity.

### Measured on the reference module

| | Before | After |
| --- | --- | --- |
| `modules/customers`, tests included | 45 files, 2,423 lines | 37 files, 2,206 lines |
| of which tests | 15 files, 1,066 lines | 15 files, 1,034 lines |
| its HTTP edge (controllers and routes file) | 9 files, 291 lines | 1 file, 106 lines |
| `modules/audit`, tests included | 11 files, 361 lines | 10 files, 335 lines, one test added |

The helper, the test harness and the helper's test (272 lines) are written once, in identity.

A spike built a throwaway second module from the mould, with one list and one create. Its routes file
held 27 lines. The longest run of lines it shared with the customers' routes was two lines: the start
of a call (`tenant.post(` and `base,`). With ADR 0006's controllers, it would have needed two
controllers of about 25 and 30 lines besides its routes file. Outside the module, it needed what
ADR 0044 already lists: the contract file, the resource in `statements` and in `permissionsSchema`,
and the resource in `auditActions`.

### Consequences

- Good: a route reads as the module's API, in a few lines: path, permission, input, status and use
  case. A module's routes fit on one screen.
- Good: no tenant route of a module can skip the guard. A mistyped parameter, or a path outside the
  tenant prefix, fails the typecheck.
- Good: what every tenant route checks has one place, so building ADR 0063's checks changes one file.
- Good: each use case costs about 25 lines and one file less, and no route test copies its setup.
- Bad: a use case's HTTP edge is no longer in its folder. It is one declaration in the module's routes
  file.
- Bad: the API has two shapes of HTTP edge. Modules declare routes through the helpers; the platform's
  routes keep their controllers.
- Bad: a module cannot write by hand a tenant route that needs something the spec does not offer (a
  header, a stream, a redirect, a cookie), since `requireMember` is not exported. The helper must grow
  a field for it, reviewed against this record.
- Bad: the parameter names come from a template literal type. When the check fails, the compiler's
  message names the type, not the path.

## Revisit when

A tenant route needs an answer the helper cannot give (a file, a stream, a redirect), the spec passes
about six fields, or a module's routes file passes about 150 lines (then split it by resource).
