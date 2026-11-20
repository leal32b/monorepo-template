# 0077. Run the SaaS from an operator back office that reads through a role of its own and enters an organization read only

- Status: proposed
- Date: 2026-11-20

Amends [ADR 0061](0061-keep-one-append-only-audit-trail-per-organization.md) (the actor `operator`, its
two entries, and "a trail of the deletion itself belongs to … an operator's back office"),
[ADR 0065](0065-declare-a-modules-tenant-routes-through-one-helper-without-controller-classes.md) (what
`tenantRoutes` refuses during an impersonation) and the accepted risk of
[ADR 0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md) about "a future back
office" on the pool. Item P1-7 of the product readiness plan.

## Context and problem statement

The people who run a SaaS built from this template have no screen. Finding a tenant, its plan or its
owner means a SQL console on the production database, which is both slower and far more dangerous than
any screen: it reads every column of every table, writes anything, and leaves no trace an organization
can see. Support also needs to see what a customer sees ("the button is grey"), which today means asking
for screenshots.

This is the most privileged surface of the product. What makes someone an operator, how do the back
office's reads cross the tenant net of ADR 0055 without weakening it, what does an operator see, and
how does an operator look at an organization as its owner without being able to act as one, or to do it
unseen?

## Decision drivers

- Nobody becomes an operator through the product: not by signing up, not through a role of an
  organization, not through a request. Revoking one takes effect on the next request.
- A stolen password is not an operator. An operator signs in with a second factor, and a stolen cookie
  stops working within a working day.
- The back office cannot be found: a caller who is not an operator learns nothing, not even that it
  exists.
- The tenant role `app_tenant` keeps exactly what it has. The back office reads through something of its
  own, read only unless a use case needs a write, and only the back office reaches it.
- An organization always knows when an operator looked at it, and who; the operator always knows they
  are inside someone else's organization, and for how long.
- Looking is not acting. An operator inside an organization can never change a credential, delete an
  account or an organization, manage billing, or write anything else.
- The template's usual shape: plain `node:http`, ports and Kysely adapters, contracts in
  `@repo/contracts`, list screens of ADR 0066, dictionaries loaded with their routes (ADR 0071), and no
  new service or connection string.

## Considered options

### Who is an operator

1. Better Auth's admin plugin: a `role` column on the user, `admin` meaning operator, and its endpoints
   (`/admin/list-users`, `/admin/impersonate-user`, …).
2. A table of ours, `operator`, written only by a command run with the database's owner credentials.

### How the back office reads across tenants

1. On the pool, as the tables' owner, as the purge does.
2. A platform transaction (ADR 0063's `KyselyPlatformUnitOfWork`).
3. A role of its own, `app_operator`, without login, switched to inside a transaction as `app_tenant` is,
   granted `select` on named columns, and that transaction `read only`.

### How an operator enters an organization

1. A real session of the owner, made for the operator (what the admin plugin's `impersonate-user` does),
   with every write that must not happen refused by a list in Better Auth's `before` hook.
2. The operator keeps their own session; while an impersonation of theirs is active, the tenant guard
   answers for them in that organization as a read-only member.

## Decision outcome

Operators are a table of ours (who, option 2); the back office reads through `app_operator` in read-only
transactions (reads, option 3); and an operator enters an organization with their own session, as a
read-only member, for 30 minutes, recorded in that organization's trail (entering, option 2). Everything
lives in a new module, `modules/back-office`, under `/api/admin/*`, and on the web under `/admin`, the
slug ADR 0034 already reserved.

### Who is an operator

```sql
create table operator (
  id text primary key,
  user_id text not null references auth."user" ("id") on delete cascade,
  granted_at timestamptz not null,
  revoked_at timestamptz,
  -- Who ran the command, as they typed it: a name or an address, for the record.
  granted_by text not null,
  revoked_by text
);
create unique index operator_active_idx on operator (user_id) where revoked_at is null;
```

- **Granted by a command, never by the product.** `pnpm --filter @repo/api operator grant <email> --by <name>`
  (and `node dist/operator.js grant …` in the built image) inserts the row. It runs with `DATABASE_URL`,
  the owner's credentials, which only the person who deploys holds; no route, no Better Auth endpoint and
  no role of `app_tenant` or `app_operator` can write the table. The admin plugin is not installed, so its
  endpoints, its `role` column and its user management do not exist.
- **The command refuses an account that could sign in without a second factor**: one whose email is not
  confirmed, one without two-step verification on, and one with a sign-in method other than its
  password (a linked Google account), since Better Auth's `twoFactor` plugin asks for the code only on a
  password sign-in.
- **Revoked by the same command**: `operator revoke <email> --by <name>` sets `revoked_at` and ends the
  operator's active impersonation, with its entry in the organization's trail. Every back-office request
  and every impersonated read checks the row, so it takes effect at once. The rows stay: they are the
  record of who was an operator, when, and on whose word. `operator list` prints them.
- **Two-step verification and the session's age.** A back-office request is served only when the
  operator's account still has two-step verification on and no other sign-in method, and the session
  was created **after the grant** and **within the last 12 hours**. After the grant, that session went
  through the password and a code; 12 hours is a working day, after which a stolen cookie no longer opens
  the back office (it still opens the product, as any user's would). An operator whose session fails one
  of these gets `403 operator_session_refused` with the reason, and the web asks them to sign in again.

  Better Auth's "trust this device" would skip the code at a later sign-in. The web never offers it; a
  caller who sends `trustDevice` to the API by hand gets a device that skips the code for 30 days. That
  is the operator's own account, and the threat model lists it.

### How the back office reads

Migration `0019_operator_back_office.sql` creates `app_operator` (`nologin`, no attributes, granted to the
role the API connects as) and grants it:

| What | Grant | Why |
| --- | --- | --- |
| `auth.organization` | `select (id, name, slug, "createdAt", "timeZone", currency)` | The list and the page. Not `logo` nor `metadata`. |
| `auth.member` | `select ("organizationId", "userId", role, "createdAt")` | The owner, the members and their count. |
| `auth."user"` | `select (id, name, email, "emailVerified", "createdAt", "twoFactorEnabled")` | The users' list and the guard. Never `image`, never `legal*`. |
| `auth.session` | `select ("userId", "createdAt")` | The last sign-in. Never the token, the address or the user agent. |
| `auth.account` | `select ("userId", "providerId")` | The guard's "no other sign-in method". Never a password hash or a token. |
| `subscription` | `select`, with a policy `for select to app_operator using (true)` | The plan and its state. |
| `operator` | `select` | The guard. |
| `impersonation` | `select, insert`, `update (ended_at, end_reason)` | Entering and leaving. |
| `audit_entry` | `insert`, with a policy that allows only `actor_kind = 'operator'`, `resource_type = 'organization'` and the two impersonation actions | The organization's record of it. No `select`: an operator does not read the trail outside an impersonation. |
| `job` | `insert`, with a policy that allows only `back-office.end-impersonation` | The end at the time limit. |

Nothing on `auth.twoFactor`, `auth.verification`, `auth.invitation`, `auth."organizationRole"`, nor on any
product table (`customer`, `organization_logo`, `organization_export`): the back office shows the state of
an organization, not its records. A product that wants more grants it here, by column, in its own
migration and ADR.

`KyselyOperatorUnitOfWork` (`modules/back-office/database/`) opens the transaction:

- `read(work)` starts it `read only` and switches to the role: `start transaction read only`, then
  `select set_config('role', 'app_operator', true)`. A write in it fails twice over: the transaction
  refuses it, and the role holds no grant for most of it.
- `write(work)` is the same without `read only`, for the two use cases that enter and leave an
  organization, and the job that ends one; the grants above are all it can write.

Both are local to the transaction, as ADR 0055's are, so nothing of them reaches the next request through
the pool or a pooler.

**Only the back office reaches it.** dependency-cruiser's rule `api-operator-role-stays-in-the-back-office`
lets only `modules/back-office/` and the composition root import the unit of work, and the module's index
exports neither it nor its ports. `app_tenant` is unchanged: the net's test still finds every
`organization_id` table protected, and now also proves that `app_tenant` can read nothing the operator
role adds (`operator`, `impersonation`).

`impersonation` names an organization, so the net's test (`unprotectedTenantTables`) would ask for a
policy for `app_tenant`. The test now accepts a table with row security enabled that `app_tenant` holds no
privilege on: it cannot reach it at all, and a policy for it would be a grant waiting to be added. The
check still fails a table that names an organization without row security, and one granted to the
tenant role without a policy.

### The guard: 404 for everyone else

`backOfficeRoutes(router, deps)` is the module's route helper, the back office's `tenantRoutes`. Each
request:

1. reads the session; **none is a 404**;
2. reads the operator row, in a read-only operator transaction; **not an operator, or revoked, is a 404**;
3. checks two-step verification, the other sign-in methods and the session's age: `403
   operator_session_refused`, with `reason` (`two-factor`, `sign-in-method`, `sign-in-again`), an answer
   only an operator ever sees;
4. parses the input with the contract's schema, then runs the use case.

The 404 is the router's own `not_found` body, byte for byte, so `/api/admin/organizations` answers a
non-operator exactly as `/api/admin/nothing-here` does. The web's `/admin` screens show "not found" on
that 404.

### The screens

- **Organizations** (`GET /api/admin/organizations?search=&page=`): name, slug, plan and subscription
  state, owner (the oldest, as ADR 0073's `OrganizationOwners` picks), created, members count; searched
  by name, slug or the owner's email; 20 a page, newest first.
- **An organization** (`GET /api/admin/organizations/:organizationId`): the same, with its time zone and
  currency, its members (name, email, role, joined) and the button that enters it.
- **Users** (`GET /api/admin/users?search=&page=`): email, name, created, last sign-in (the newest live
  session's creation; the daily purge removes expired sessions, so "none" means none in 30 days),
  whether two-step verification is on, and their organizations with their role; searched by email or
  name.

All three are reads in the operator role's read-only transaction, paged with a count, so the web draws them
with `createList`, `ListToolbar` and `ListPager` (ADR 0066).

### Entering an organization

`POST /api/admin/organizations/:organizationId/impersonation` starts one; `DELETE /api/admin/impersonation`
ends it; `GET /api/admin/impersonation` says which one is active.

```sql
create table impersonation (
  id text primary key,
  operator_id text not null,        -- no foreign key: the record outlives the account
  organization_id text not null references auth."organization" ("id") on delete cascade,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  ended_at timestamptz,
  end_reason text check (end_reason in ('left', 'expired', 'revoked'))
);
create unique index impersonation_active_idx on impersonation (operator_id) where ended_at is null;
```

- **The operator keeps their own session.** No session of the owner is made. While the impersonation is
  active, identity's membership read (`Membership.memberOf`), on finding the operator is not a member,
  finds the impersonation (active, not past its time, its operator not revoked) and answers with a
  member whose roles are `['owner']`, whose subscription and entitlements are the organization's, whose
  permissions are only the `read` actions of `statements` (`impersonationPermissions` in
  `@repo/contracts`), and which carries `impersonation: { endsAt }`.
- **Read only, in three places.** The permissions hide every write on the screens and refuse it at the
  permission check. `tenantRoutes` refuses any `post`, `put` or `delete` from an impersonated member with
  `403 impersonation_read_only`, before the permission and whatever the route's `duringReadOnly` says, so a
  route declared with `{}` cannot write either. And Better Auth only ever sees the operator's own
  session, so its organization endpoints (rename, invite, remove a member, delete the organization) refuse
  a caller who is not a member, and its account endpoints act on the operator's own account.
- **What an impersonation can never do**, by construction rather than by a list: change the owner's
  password, email, name, two-step verification or linked accounts (there is no session of theirs);
  delete the owner's account (same); delete or rename the organization, or change its members, roles or
  invitations (Better Auth refuses a non-member); manage billing, or request or download the export
  (`billing:manage` and `organization:export` are not `read` actions, and the writes are refused anyway).
- **30 minutes.** Long enough to follow a support conversation through a few screens, short enough that a
  forgotten tab closes itself. One at a time per operator: entering a second organization while one is
  active answers `409 impersonation_active`.
- **In the organization's trail.** Starting writes, in one operator transaction, the `impersonation` row,
  an audit entry `organization.impersonation-started` with the actor `{ kind: 'operator', id }`, and a
  job `back-office.end-impersonation` at `expires_at`. Leaving writes `ended_at` and the entry
  `organization.impersonation-ended`; the job, at the time limit, does the same with `end_reason =
  'expired'` if nobody did; revoking the operator, with `'revoked'`. The job is idempotent (`where
  ended_at is null`). The audit read names an operator from the `operator` table and the user's name, so
  the owner reads "Ada Lovelace (operator) entered the organization" even though Ada is no member.
- **The banner.** Every screen behind the session draws it while an impersonation is active, above the
  frame: "You are viewing Acme as its owner sees it. Read only, until 14:32." with "Leave". The back
  office's frame draws it too. At the time limit the web leaves on its own. The web asks
  `GET /api/admin/impersonation` only where this device started one (a hint in local storage, ADR 0042's
  pattern), so no other user's console shows the back office's 404.
- **Where the organization comes from on the web.** The operator is no member, so Better Auth's list of
  organizations does not have it. The tenant frame (`RequireOrganization`) adds the impersonated
  organization to that list. The members, roles and plan screens read Better Auth's organization
  endpoints, which a non-member cannot call: during an impersonation the side menu does not offer them,
  and the back office's organization page shows the members and the plan instead.

### Where it lives

- **API:** `modules/back-office/` with `back-office.routes.ts` (the six routes), its use cases in
  `queries/` and `commands/`, the ports `BackOfficeUnitOfWork`, the Kysely unit of work and adapters in
  `database/`, the job in `jobs/`, the guard in `back-office-route.ts`. Identity gains the impersonation
  branch of `memberOf` and `operatorNamesOf`; `tenantRoutes` gains the read-only refusal.
- **Web:** `/admin` sits behind the session guard but outside the app's frame, in `BackOfficeFrame`
  (`widgets/back-office-frame`), a top bar with its own menu (Organizations, Users) and the banner. Its
  screens are `pages/back-office-organizations`, `pages/back-office-organization`,
  `pages/back-office-users`, built with `screenOf(…, ['backOffice'])`: the `backOffice` dictionary group,
  in en, pt-BR and es, loads with its route and never reaches a tenant's download. The banner's few words
  are in the core `shell` group, since it is drawn over every screen. The entity `back-office` holds the
  queries and the impersonation's hint; the feature `leave-impersonation` holds the banner and its button.

### Threat model

Boundary B10 (operator ↔ organizations) and rows T67 to T73 of
[docs/security/threat-model.md](../security/threat-model.md): becoming an operator; a stolen operator's
password or cookie; finding the back office; reading more than the back office needs; acting through an
impersonation; an impersonation the organization does not see; and back-office code reaching tenant
tables.

[docs/operations.md](../operations.md) has "Operators": granting the first one in production, revoking,
and auditing who was an operator and who entered which organization.

Sources: [Postgres column privileges (`GRANT … (column)`)](https://www.postgresql.org/docs/current/sql-grant.html),
[`SET TRANSACTION … READ ONLY`](https://www.postgresql.org/docs/current/sql-set-transaction.html),
[row security policies, per command](https://www.postgresql.org/docs/current/sql-createpolicy.html),
[Better Auth admin plugin](https://www.better-auth.com/docs/plugins/admin) (its endpoints and its
impersonation), [Better Auth two-factor plugin](https://www.better-auth.com/docs/plugins/2fa) (the paths
it guards: password sign-ins), [OWASP Authorization Cheat Sheet, deny by default](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
Read on 2026-11-20.

### Why not the others

- **The admin plugin** brings fifteen endpoints to every user with `role = 'admin'`, among them
  `set-user-password`, `remove-user`, `create-user` and `ban-user`; its impersonation makes a real session
  of the target, so every write the operator must not make has to be named in a hook, and one missed path
  is a takeover. Its role is a column any future code that updates a user could set. A table only the
  owner's credentials write, and a session that stays the operator's, fail closed instead.
- **Reading on the pool as the owner** puts the most privileged surface outside every net: any column of
  any table, writes included, and the owner bypasses row security on the default host. **A platform
  transaction** is the same thing in a transaction. A role of its own costs one migration and a
  dependency rule, and makes "read only" and "these columns" facts Postgres checks.
- **A session of the owner** is what support usually means by impersonation, and it shows every screen,
  members and plan included. It also hands the operator a credential of the owner's, valid for whatever
  the hook forgets, and mixes the operator's acts into the owner's sessions. Read-only through the guard
  shows the screens the API serves, refuses writes in the place every tenant route already passes, and
  never holds a credential of anyone but the operator.

### Consequences

- Good: becoming an operator needs the database owner's credentials; revoking takes effect on the next
  request; a stolen password without the code, or a cookie older than 12 hours, is not an operator.
- Good: a non-operator, signed in or not, gets the same 404 on every back-office route; a test walks
  them all.
- Good: the back office reads named columns in read-only transactions, and writes only what entering and
  leaving need; `app_tenant` gained nothing.
- Good: every impersonation shows in the organization's own trail, naming the operator, at its start and
  its end, even when the tab was closed.
- Good: an impersonation cannot write anything, nor change a credential, nor delete an account or an
  organization, nor manage billing, and holds no credential of the owner's.
- Bad: during an impersonation the members, roles and plan screens are not offered (Better Auth refuses a
  non-member); the back office's organization page shows that state instead.
- Bad: support cannot fix something for a customer by entering their organization; it tells them what to
  do, or a product decides, in its own ADR, which writes an operator may make and how each is attributed.
- Bad: the operator role is a second name in the cluster, as `app_tenant` is (ADR 0055's note on two
  products sharing a cluster applies to both).
- Bad: Better Auth's "trust this device", sent to the API by hand, lets an operator skip the code on
  that device for 30 days.
- Bad: the back office keeps no log of what an operator only looked at in its own screens (the list, a
  user); the request log has each route, status and time for a few days.

## Revisit when

Support needs to change something inside an organization (then decide which writes, attributed to the
operator, with their own audit actions); a product needs operator roles (read-only support and full
admins); an operator must see an organization's records from the back office itself; the number of
organizations makes the search's `ilike` slow (then a trigram index); or Better Auth records how a
session was signed in, which would replace "created after the grant" with the method itself.
