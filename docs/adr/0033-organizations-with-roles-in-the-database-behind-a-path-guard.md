# 0033. Run organizations on Better Auth, with roles in the database, behind a guard on the path

- Status: accepted
- Date: 2026-11-04

## Context and problem statement

Phase 6.5 makes the template multi-tenant. A product built from it must get organizations, members,
roles, invitations and a tenant guard by configuration. Phase 7 then builds the first module scoped to
a tenant on that guard.

[ADR 0020](0020-authenticate-with-better-auth.md) chose Better Auth and left organizations to this
record. Step 1 tried the organization plugin ([spike notes](../organizations-spike.md)). It does most
of the work, but it leaves gaps that this record closes:

- a role can be given to someone, or to oneself, even when it grants more than the giver holds;
- a role can be renamed or deleted while members or invitations still hold it;
- slugs are not validated;
- rate limits count per IP only.

The questions are these:

- Where does the API learn the tenant from?
- Where do roles live?
- Who may give which role?
- How do invitations, limits and deletion work?

The owner settled D1 and D3 to D7 of the [plan](../organizations-plan.md) on 2026-11-04. D2 is
[ADR 0034](0034-keep-the-organization-slug-in-the-web-url.md).

## Decision drivers

- No tenant data reaches someone who is not a member, whatever ids the caller sends.
- A member never gains, through any route, a permission that nobody who holds it gave them.
- A product adds a resource to the permissions in one place, and writes no auth code.
- Product modules never import `better-auth` ([ADR 0020](0020-authenticate-with-better-auth.md),
  [ADR 0008](0008-architecture-boundaries-with-dependency-cruiser.md)).
- Few support contacts: no stray tenants, no member silently left without permissions, and a reason
  for every refusal.

## Considered options

For the whole of tenancy:

1. Better Auth's organization plugin with `dynamicAccessControl`, closed by our hooks, behind our
   guard on the path.
2. The same plugin with static roles only, defined in code.
3. Our own tables, endpoints and checks for organizations, beside Better Auth for identity.

For where the API reads the tenant from (D1):

- a. the path, `/api/organizations/:organizationId/...`;
- b. the session's `activeOrganizationId`, set by the plugin's `set-active`;
- c. a header such as `X-Organization-Id`.

## Decision outcome

Chosen options 1 and a.

### Tenant on the path (D1)

- Every route scoped to a tenant is `/api/organizations/:organizationId/...`.
- The route calls `requireMember(request, organizationId, permission?)` from
  `#modules/identity/index`. It gets a `Member` (user, organization, roles and resolved permissions),
  or a problem:
  - 401 without a session;
  - 404 for an organization that does not exist, and for one the caller is not in, so ids cannot be
    probed;
  - 403 for a member who lacks the permission.
- The guard never reads `activeOrganizationId`, so a stale tab cannot write to the wrong tenant. The
  plugin still writes that column, and nothing of ours reads it.
- The guard reads `auth.member` and the organization's `auth."organizationRole"` rows with Kysely, in
  `identity/infrastructure/`. It does not call the plugin's `hasPermission`, which answers only yes or
  no, ignores custom roles without a request context, and caches in a module-level map.
- A product query scoped to a tenant always filters on the `organizationId` that the guard returned,
  never on one from the body.

### Roles in the database, statements in code (D3)

- **Statements.** The resources and their actions are a plain object in `@repo/contracts`:
  `organization`, `member`, `invitation` and `ac` (roles), with the plugin's actions. Identity builds
  the access control from it (`createAccessControl`). Phase 7 adds its resource there.
- **Built-in roles.** `owner`, `admin` and `member` are defined in that same object and cannot be
  edited. `owner` holds everything; `admin` holds everything but `organization:delete`; `member` holds
  `ac:read`.
- **Custom roles.**
  - Each organization adds up to 20 custom roles over the statements
    (`maximumRolesPerOrganization`, overridable).
  - Names are lowercased; built-in names are refused.
  - `organization:delete` belongs to `owner` only, and a custom role cannot hold it.
- **A member's role** is a comma list, and a member holds the union of its roles' permissions. A role
  name with no definition grants nothing.
- **The web** learns the caller's permissions from the API (`GET .../me`, step 6), never from the role
  name.

### No escalation (from the spike)

- **Defining a role.** Nobody puts into a role a permission they do not hold. The plugin already
  checks it on `create-role` and `update-role`.
- **Giving a role.**
  - A role may be given only by someone who holds every permission it grants, on `invite-member` and
    on `update-member-role`.
  - The plugin guards only `owner` there. We add the check: in `beforeCreateInvitation`, which
    receives the inviter, and in a global `hooks.before` on `/organization/update-member-role`,
    because the plugin's own hook for it does not receive the caller.
- **Members above you.** A member may change or remove only members whose roles grant nothing the
  actor lacks. `owner` keeps its own rule: only an owner gives or removes it.
- **Roles in use.** Renaming or deleting a role that a member or a pending invitation holds is
  refused, with the reason. The plugin refuses only the delete of a role that members hold. A rename
  would leave members silently without permissions, and a role later created with the old name would
  silently give them its permissions.

### Nothing created automatically (D4)

- No organization is created at sign-up.
- After sign-in, pending invitations come first. With none, a one-field "Name your organization"
  screen follows; the slug is derived from the name and can be changed later.

### Invitations (D5)

- Only the invited address may read, accept or reject an invitation, and only with a confirmed email:
  `requireEmailVerificationOnInvitation: true`. The plugin's default leaves this check off.
- Invitations expire in 7 days; the plugin's default is 48 hours.
- A re-invite cancels the pending invitation (`cancelPendingInvitationsOnReInvite`). A resend keeps
  the invitation and moves its expiry.
- The link is `WEB_ORIGIN/invitations/:id`. A signed-out invitee signs in or signs up and comes back.
- The email is the kind `invitation` of [ADR 0021](0021-send-email-through-a-provider-neutral-port.md),
  in the inviter's language.
- An expired invitation stays `pending` in the table, so the web filters on `expiresAt`.
- The plugin answers "not found" for an invitation that expired, was withdrawn or was already
  answered, so the link's screen could not say what to do. `GET /api/invitations/:invitationId`
  (contract `Invitation`) tells the invited address what became of it: `pending`, `expired`,
  `accepted` (and whether they are still a member), `declined` or `withdrawn`, with the
  organization's and the inviter's names. It answers 401 without a session, 404 for an unknown id
  and 403, with nothing more, to any other account. Accepting and declining stay with the plugin.

### Limits (D6), overridable from one config object

| Limit | Value | Enforced by |
| --- | --- | --- |
| Organizations per user | 5 | `organizationLimit` |
| Members per organization | 100 | `membershipLimit` |
| Pending invitations per organization | 100 | `invitationLimit` (plugin default) |
| Invitations per user | 10 per 60 s | a count in `beforeCreateInvitation` of the inviter's recent invitations |
| Invitations per IP | 10 per 60 s | `rateLimit.customRules['/organization/invite-member']`; also covers resends |
| Custom roles per organization | 20 | `maximumRolesPerOrganization` |

Better Auth's limiter counts per IP and path only, so the per-user rule is ours.

### Lifecycle (D7)

- The last owner cannot leave, be removed or be demoted; the plugin enforces it.
- Only an owner deletes an organization. `beforeDeleteOrganization` checks that the caller holds
  `owner`, and Phase 7 adds its own cleanup there. The web also asks for the organization's name to be
  typed.
- Deleting an organization removes its members, invitations and custom roles (`on delete cascade`).

### Schema and validation

- `migrations/0003_organizations.sql` is printed by `auth:schema`. By hand, it adds unique indexes on
  `member (organizationId, userId)` and `organizationRole (organizationId, role)`, which the plugin
  checks only with a read.
- Names and slugs are checked with the `@repo/contracts` schemas in `beforeCreateOrganization` and
  `beforeUpdateOrganization`. The plugin accepts any slug, `"Has Spaces/And?Query"` included.

### Interface

- Organizations are managed through Better Auth's `/api/auth/organization/*`, with `organizationClient`
  in the web.
- This stays inside the contracts exception of
  [ADR 0020](0020-authenticate-with-better-auth.md). Our own routes, such as `.../me`, have
  contracts.
- The plugin's refusals use uneven statuses: 400, 401 and 403 for similar cases. The web maps their
  `code`, not their status.
- Teams stay off.

### Why not the others

- **Option 2, static roles.** Every new role would be a deploy, and organizations could not shape
  roles to their teams. It is simpler, but the plugin's checks on role definition and our checks on
  role assignment make custom roles safe enough.
- **Option 3, our own tables.** It would repeat what the plugin ships: the last-owner rule, invitation
  states, limits and the client. Every fix would then be ours to find.
- **Option b, the session's active organization.** One session would point at one tenant for every
  tab, so a tab left open on another tenant writes to the wrong one. It is also state on the server
  that a link cannot carry.
- **Option c, a header.** It works for an API client, but a link cannot carry it, and it adds a second
  source of truth beside the URL.

### Consequences

- Good: tenant isolation is one call per route, with the tenant written in the path.
- Good: a product defines its permissions in one object, and organizations compose roles from them.
- Good: escalation is closed both where a role is defined and where it is given.
- Bad: each guarded request makes two reads, membership and custom roles. That is cheap, but there is
  no cache.
- Bad: the hooks reach into the plugin's paths and payloads. A Better Auth upgrade can move them, so
  their `.db.test`s through HTTP must stay.
- Bad: the plugin's own endpoints can tell an existing slug from a missing one (`check-slug`,
  `get-full-organization`). Slugs are therefore not secret; ids are.
- Bad: every member can list the organization's members and their emails (`list-members` needs only
  membership).

## Revisit when

- A Better Auth upgrade changes the organization plugin's paths, hooks or schema: the `auth:schema`
  diff or the hook tests fail.
- A product needs teams, enterprise SSO or SCIM, or MFA required per organization.
- A product needs permissions on single records rather than on resource types.
- The two reads per guarded request show up in latency, which would call for a cache.
