# Organizations and authorization: implementation plan

Phase 6.5 of the [plan](plan.md): organizations, members, roles and invitations by configuration,
behind a tenant guard on the path, so a product built from the template writes no auth code. Phase 7
then builds the first tenant-scoped module on that guard.

- Working copy with a status per step: https://claude.ai/artifact/Tc3KJyxuvZULSBzAat5RFh (private to
  the owner; an agent reads it with the docs tools).
- Legend: 🟦 Sonnet is enough · 🟥 use Opus (a decision that is expensive to undo).

## How this phase runs

- The agent writes the files straight into the repository; teaching mode's "the owner creates each
  file" is lifted for this phase only.
- After each step the agent stops, shows the diff and the gates, and waits for the owner's OK before
  committing and before starting the next step. One commit per step.
- Two sessions, one on Sonnet and one on Opus, taken in turns by each step's model.
- TDD (`tdd-slice`), one decision per ADR (`write-adr`); every screen goes through `design-system`
  and `minimize-support`.

## Scope

In:
- Better Auth's organization plugin: organizations, members, roles with custom permissions,
  invitations by email.
- A tenant guard on the path, `/api/organizations/:organizationId/...`: 404 for a non-member,
  403 for a member without the permission.
- Ports in `modules/identity/index.ts` for membership and permission, so product modules never
  import `better-auth`.
- Screens: create an organization, switch, members, roles, invite, accept or decline.

Out: teams (sub-groups), enterprise SSO and SCIM, billing per organization, MFA required per
organization, a tenant-scoped product CRUD (Phase 7), Playwright (Phase 8).

## Starting point

Phase 6 left every seam this phase needs; nothing moves, it is only extended.

| Piece | Where | What 6.5 does with it |
| --- | --- | --- |
| Better Auth 1.7.14 config | `apps/api/src/modules/identity/infrastructure/auth.ts` | Adds `organization()` next to `haveIBeenPwned()` and `twoFactor()` |
| Session port and 401 guard | `identity/current-session.port.ts`, `identity/require-actor.ts` | A sibling port for membership and permission, and `requireMember` (404/403) |
| Public surface of identity | `identity/index.ts` (re-exports only) | Exports the new port, the guard, the `Member` type |
| Boundary rule | `.dependency-cruiser.cjs`, rule `api-better-auth-stays-in-identity` | Unchanged; the new code stays inside it |
| Migrations | `apps/api/migrations/`, schema `auth` | `0003_organizations.sql`, printed by `pnpm --filter @repo/api auth:schema` |
| Email texts | `identity/emails/locales/{en,es,pt-BR}.ts` | A new kind, `invitation` |
| Routes | `apps/api/src/app/http-routes.ts` | `/api/auth/organization/*` already falls under `/api/auth/*`; one guarded route proves the guard. The router already reads `:params` |
| App shell | `apps/web/src/widgets/app-shell`, [shell plan](design/app-shell-plan.md) | Organization at the top of the side menu; Settings gets "Organization" (General, Members, Roles); Home gets "Invite people" |
| Threat model | [`security/threat-model.md`](security/threat-model.md) | Scope extended to tenancy |

The plugin ships the server side: built-in roles `owner`, `admin` and `member`,
`createAccessControl`, an exported `hasPermission`, `dynamicAccessControl`, `sendInvitationEmail`,
`invitationExpiresIn`, `membershipLimit`, `organizationLimit`,
`requireEmailVerificationOnInvitation` and `cancelPendingInvitationsOnReInvite`. Teams stay off.

## Decisions

Settled by the owner on 2026-11-04, and refined the same day by the
[spike](organizations-spike.md). D2 is [ADR 0034](adr/0034-keep-the-organization-slug-in-the-web-url.md);
the rest are [ADR 0033](adr/0033-organizations-with-roles-in-the-database-behind-a-path-guard.md).

- **D1. The API learns the tenant only from the path**, `/api/organizations/:organizationId/...`.
  The guard never reads the session's `activeOrganizationId`, so a stale tab cannot write to the
  wrong tenant.
- **D2. The web keeps the current organization in the URL** as the slug, `/:orgSlug/...` for tenant
  screens; account, entry and invitation screens stay outside it. A shared link opens the same
  tenant for a teammate. Set aside: Better Auth's `setActive` on the session.
- **D3. Roles live in the database** (`dynamicAccessControl`).
  - The statements (resources and actions) stay in code, as a plain object in `@repo/contracts`;
    identity builds the access control from it. Phase 7 adds its resource there.
  - `owner`, `admin` and `member` are built in and cannot be edited; each organization adds its own
    roles over the statements, up to 20 (overridable).
  - Nobody grants a permission they do not hold: the plugin checks it on create and update.
  - Nobody gives a role that grants more than they hold, on invite or role change, and nobody
    changes or removes a member whose roles grant more than theirs (from the
    [spike](organizations-spike.md); ADR 0033).
  - `organization:delete` is the owner's only; no custom role holds it.
  - A role held by a member or a pending invitation cannot be renamed or deleted.
  - The web learns the caller's permissions from the API, never from the role name.
  - Set aside: static roles only, in code, where every new role is a deploy.
- **D4. Nothing is auto-created.** After sign-in, pending invitations come first; with none, a
  one-field "Name your organization" screen. Set aside: a personal organization at sign-up, which
  leaves invited users with a stray empty tenant.
- **D5. Invitations** expire in 7 days; only the invited address may accept, with a confirmed email
  (`requireEmailVerificationOnInvitation`); a re-invite cancels the pending one; the link is
  `WEB_ORIGIN/invitations/:id`; a signed-out invitee signs in or up and comes back to it.
- **D6. Limits**, overridable from one config object: 5 organizations per user, 100 members, an
  invite rate rule of 10 per 60 s per user (a count in `beforeCreateInvitation`) and per IP
  (`customRules`), since Better Auth's limiter counts per IP only.
- **D7. Lifecycle.** The last owner cannot leave or be demoted. Only an owner deletes, after typing
  the name; deletion runs a `beforeDeleteOrganization` hook that Phase 7 fills with its cleanup.

The guard answers 404 both for an organization that does not exist and for one the caller is not
in, so ids cannot be probed. Organization management goes through Better Auth's
`/api/auth/organization/*` with `organizationClient`, inside the contracts exception of
[ADR 0020](adr/0020-authenticate-with-better-auth.md).

## Steps

Each step ends green with `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps && pnpm lint:fsd`;
a screen also gets a look in the browser at 375×812 and desktop, light and dark. Steps 1 and 3 can
run side by side; steps 8 to 13 can be reordered after step 7.

### 1. Spike the plugin · 🟥 Opus (library internals every later step trusts) · done
Notes: [organizations-spike.md](organizations-spike.md).

Turn `organization()` with `dynamicAccessControl` on locally and print the SQL with `auth:schema`.
Write down, for the ADR:
- the last-owner rule;
- `hasPermission` without an active organization;
- how custom roles in `organizationRole` resolve, and the no-escalation check on create and update;
- what happens to members whose role is deleted;
- how to tell a non-member (404) from a member without the permission (403);
- the invitation email check, and the rate limits on `/organization/*`.

Nothing is committed but the notes.

### 2. ADRs and threat model · 🟥 Opus (tenancy decisions) · done
- ADR 0033: organizations, tenant on the path, roles in the database over statements in code,
  invitations, limits, lifecycle (D1, D3 to D7).
- ADR 0034: the organization slug in the web URL (D2). Index updated.
- Threat model scope extended: IDOR, role escalation, invitation abuse, enumeration.

### 3. Permissions in contracts · 🟦
`packages/contracts/src/organizations.ts`: statements (resources and actions), the built-in roles
with their permissions, the owner-only permissions (`organization:delete`), a `Permissions` schema,
`can(permissions, required)`, `covers(held, granted)` (every permission of a role is held), and
schemas for role name, organization name and slug (lowercase letters, digits and single hyphens, at
most 48, reserved words per [ADR 0034](adr/0034-keep-the-organization-slug-in-the-web-url.md)).
Tests at 100%.

### 4. Plugin, migration and invitation email · 🟥 Opus (auth options and a schema migration)
- `organization()` in `infrastructure/auth.ts` with the access control from step 3,
  `dynamicAccessControl` (20 roles), the options and hooks of D5 to D7, the invite rate rule.
- `migrations/0003_organizations.sql`, with `organizationRole`, plus unique indexes on
  `member (organizationId, userId)` and `organizationRole (organizationId, role)`.
- Email kind `invitation` in en, es and pt-BR.
- Hooks that close the spike's gaps:
  - a role is given only by someone who holds all its permissions (`beforeCreateInvitation`, and
    `hooks.before` on `/organization/update-member-role`); no change or removal of a member above you;
  - `organization:delete` refused in custom roles; `beforeDeleteOrganization` checks `owner`;
  - rename or delete of a role held by a member or a pending invitation refused;
  - name and slug checked with the step 3 schemas on create and update;
  - the per-user invite count beside the per-IP rule.
- A `.db.test` through HTTP for each: an organization, a custom role and an invitation are created; a
  role cannot grant more than its creator holds, nor be given by someone who lacks it.

### 5. Membership port and `requireMember` · 🟥 Opus (the authorization boundary)
- `identity/membership.port.ts`, its adapter in `infrastructure/` (reads `member` and
  `organizationRole` with Kysely; built-in and custom roles; not the plugin's `hasPermission`), and a
  fake for tests.
- `identity/require-member.ts`: a `Member`, or a 404 or 403 problem.
- Exported from `identity/index.ts`; dependency-cruiser green.

### 6. First guarded route · 🟦
Contract `OrganizationMembership` (role and resolved permissions);
`GET /api/organizations/:organizationId/me` as a query use case. Integration tests: 401, 404 for a
missing and for a foreign organization, 200 with a built-in and with a custom role.

### 7. Web: organization entity and routing · 🟥 Opus (routes and redirects every screen sits on)
- `entities/organizations` on `organizationClient`, with dynamic access control.
- Tenant screens under `/:orgSlug/...`; the caller's permissions loaded from step 6.
- `/` goes to the last or only organization, or to onboarding; an unknown slug shows not-found.
- This step lands the routing alone, with the shell's links tested. Steiger green.

### 8. Onboarding · 🟦
Pending invitations first, expired ones left out; with none, "Name your organization" (one field, the slug derived and
editable later).

### 9. Organization switcher · 🟦
At the top of the side menu: the current organization, the list, "Create organization"; the phone
drawer too.

### 10. Settings › Organization › General · 🟦
Rename, slug, and delete with the typed name (owner only). Actions show by permission.

### 11. Settings › Organization › Members · 🟦
List with roles (built-in and custom), change role, remove, leave. The last owner is blocked with
the reason.

### 12. Settings › Organization › Roles · 🟦
- Built-in roles read-only; create, edit and delete custom roles with a resource × action grid.
- A permission the editor does not hold shows disabled, with the reason.
- A role held by members or pending invitations cannot be renamed or deleted; the screen says so and
  names who holds it.

### 13. Invite people · 🟦
Invite form (email, any role whose permissions the inviter holds; the others disabled with the
reason); pending list with resend and revoke. "Invite people" joins Getting
started on Home.

### 14. Accept an invitation · 🟥 Opus (crosses the auth flows, handles a return URL)
`/invitations/:id`: accept or decline. Signed out, the invitee signs in or up and comes back; the
return path is checked against open redirects. A wrong account, an expired invitation and one
already accepted each say what to do.

### 15. Wrap-up · 🟦
Threat model at "in place"; plan row 6.5 done; `AGENTS.md` gains the `requireMember` convention;
README env notes; all gates green. Branch, PR text and tag `v0.6.5` left to the owner.

## Risks

| Risk | Effect | Answer |
| --- | --- | --- |
| The plugin cannot tell a non-member from a missing permission in one call | Two reads per guarded request | Confirmed in step 1: the adapter reads `member` and `organizationRole` itself |
| A custom role grants more than its creator holds | Role escalation inside a tenant | The plugin checks it; step 4 proves it with a test, step 2 records it in the threat model |
| A role is deleted while members hold it | Members left with an unknown role | Step 1: the plugin refuses it for members, not for pending invitations or a rename; step 4 refuses both |
| A role is given by someone who lacks its permissions | Escalation through assignment (seen in step 1) | Step 4's hooks on invite and role change, each with a test |
| `/organization/*` has no built-in rate rule, and the limiter counts per IP | Invitations used to send spam | The invite rules of D6 (per user and per IP), checked by a test |
| Tenant screens move under `/:orgSlug` | Broken links in the shell and Home | Step 7 lands the routing alone, with the links tested |
| A plugin upgrade changes the schema | Migration drift | `auth:schema` diff on each Better Auth update (ADR 0020) |
| Scope creeps into teams or per-organization MFA | The phase doubles | Both wait for a trigger in the plan |

After the merge, left to the owner: run Deploy, check the invitation email in production, tag
`v0.6.5`.
