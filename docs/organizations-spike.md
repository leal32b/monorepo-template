# Organization plugin: spike notes

Step 1 of the [organizations plan](organizations-plan.md). Better Auth **1.7.14**, `organization()` with
`ac`, built-in roles over a statements object, `dynamicAccessControl` (20 roles), teams off,
`organizationLimit: 5`, `membershipLimit: 100`, `invitationExpiresIn: 7 days`,
`requireEmailVerificationOnInvitation: true`, `cancelPendingInvitationsOnReInvite: true`. Every
behaviour below was observed on PGlite through `auth.api`, or read in
`better-auth/dist/plugins/organization/` where marked *(code)*. The spike code was thrown away; these
notes are the input for ADR 0033 and the threat model (step 2) and for steps 4 to 6.

## Schema (`auth:schema`)

The generator prints, for `0003_organizations.sql`:

- `session.activeOrganizationId text` (we never read it, D1, but the plugin writes it);
- `organization` (`slug` unique), `member`, `invitation`, `organizationRole`;
- every `organizationId` references `organization` **on delete cascade**; `member.userId` and
  `invitation.inviterId` cascade from `user`;
- indexes on `organizationId`, `userId`, `email` and `organizationRole.role`.

It does **not** print a unique key on `member (organizationId, userId)` nor on
`organizationRole (organizationId, role)`. The plugin checks both with a read before the insert, so two
concurrent requests can insert twice. Step 4 adds both unique indexes by hand to the migration.

## The six questions

### 1. The last owner
Enforced by the plugin, with no option needed:

| Attempt by the only owner | Answer |
| --- | --- |
| `leave` | 400 `YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER` |
| demote self (`update-member-role`) | 400 `YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER` |
| remove self (`remove-member`) | 400 `YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER` |
| an admin removes the owner | 400, same code |

With two owners, either may demote or remove the other or leave. Only an owner can set or remove the
`owner` role (`creatorRole`), on invite, role change and removal. Account deletion is off in the
template; if it is ever turned on, `member` rows cascade with the user and an organization can be left
without an owner, so that change needs its own check.

### 2. `hasPermission` without an active organization
- `POST /organization/has-permission` with no `organizationId` and no active organization:
  400 `NO_ACTIVE_ORGANIZATION`. With `organizationId` in the body it works on a fresh session. So the
  path id of D1 is enough and `setActive` is never needed.
- The `hasPermission` exported from `better-auth/plugins` takes `(input, ctx)`. Without `ctx` (or
  without `organizationId`) it skips the `organizationRole` read, so **custom roles count as no role**
  *(code)*. It also writes every resolution into a module-level `Map` keyed by organization id, with
  no eviction *(code)*. Step 5 does not use it.

### 3. Custom roles and the no-escalation check
- Resolution *(code)*: per request, every `organizationRole` row of the organization is read and each
  role becomes `ac.newRole(permission)`. A member's `role` is a comma list (`member,editor` worked);
  a check passes if any one of the roles grants it. A permission check is one read of `member` plus
  one read of `organizationRole`.
- Names are lowercased on create and rename. A built-in name is refused (400
  `ROLE_NAME_IS_ALREADY_TAKEN`); an unknown resource is refused (400 `INVALID_RESOURCE`); an unknown
  action on a known resource fails as a missing permission (403, `missingPermissions: ["project:fly"]`).
- **No escalation through a role's definition: holds.** An admin creating a role with
  `organization:delete`, or adding it to an existing role, gets 403 with `missingPermissions`.
  Creating needs `ac:create`, updating `ac:update`, deleting `ac:delete`, listing `ac:read`.
- **Escalation through assignment: open.** The plugin only guards the `owner` role there:
  - an admin assigned themselves the owner-made custom role `boss` (`organization:delete`): 200, and
    `organization:delete` then passed;
  - a custom role with only `member:update` made its holder `admin`: 200;
  - a custom role with only `invitation:create` invited an address as `admin`: 200 (as `owner`: 403).

  Fix for step 4: a role may be given only if its permissions are a subset of the giver's.
  `beforeCreateInvitation` receives the inviter, so the invite check fits there. The
  `beforeUpdateMemberRole` hook receives the target member but **not the caller**, so the role-change
  check goes in a global `hooks.before` on `/organization/update-member-role`, which reads the session.
  Step 4 must prove both with tests.

### 4. Members whose role is deleted
- `delete-role` on a role a member holds: 400 `ROLE_IS_ASSIGNED_TO_MEMBERS`. Good.
- `delete-role` on a role that only a **pending invitation** holds: 200. Accepting the invitation then
  creates a member with the dead role, who has no permissions.
- `update-role` with a new `roleName` while members hold it: 200. The members keep the old name, so
  they silently lose every permission of the role. If someone later creates a role with the old name,
  those members silently gain it.

  Fix for step 4 (`hooks.before` on `update-role` and `delete-role`): refuse renaming or deleting a role
  that a member or a pending invitation holds. The roles screen (step 12) says why and lists who holds
  it. Both cases fail closed today, so they are a support risk more than a security one.

### 5. Non-member (404) versus member without the permission (403)
- `has-permission` tells them apart in one call: a non-member gets 401
  `USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION`, **the same for an organization that does not exist**; a
  member without the permission gets 200 `{ success: false }`. But it answers only yes or no, and step
  6 must return the caller's resolved permissions.
- So the step 5 adapter reads `member` (by user and organization) and the organization's
  `organizationRole` rows itself through Kysely in `infrastructure/`, two reads or one join: no row
  means 404, a row whose roles do not grant the permission means 403. It resolves built-in roles from
  the statements in `@repo/contracts` and custom roles from their JSON, merged the same way as the
  plugin (union per resource; an unknown role grants nothing).
- The plugin's own endpoints are **not uniform**: `get-full-organization` by slug answers 400
  `ORGANIZATION_NOT_FOUND` for a missing slug and 403 for one the caller is not in, and `check-slug`
  says whether a slug is taken. Slugs can therefore be probed; organization ids are random 32-character
  strings and cannot. The threat model records slugs as not secret, and the web (step 7) resolves a slug
  only from the caller's own `organization/list`, so an unknown slug and a foreign one show the same
  not-found. `remove-member` with another organization's owner id answers "only owner" before it checks
  the organization, which leaks a little about a random id; acceptable.

### 6. Invitations and rate limits
- Only the invited address may read, accept or reject: a different account gets 403
  `YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION`. Emails are stored lowercased and compared ignoring case.
- An unconfirmed email gets 403 `EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION`.
  Without our option this check is **off by default** with Better Auth's default ids *(code)*, so the
  option stays explicit. Our sign-in already requires a confirmed email, so it is defence in depth.
- Expired: accept answers 400 `INVITATION_NOT_FOUND`. But an expired invitation stays `pending` in the
  table, `list-user-invitations` **still returns it**, and `reject` still works on it. Onboarding
  (step 8) filters on `expiresAt`.
- Re-invite: the old row becomes `canceled` and a new one is created. `resend: true` keeps the row,
  moves `expiresAt` forward and sends the email again. The plugin's default expiry is 48 h, so the 7 days
  of D5 must be set.
- Already a member: 400 `USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION`. No `invitation:create`: 403.
  At most 100 pending invitations per organization by default (`invitationLimit`).
- Rate limits *(code)*: the plugin declares no rule, so every `/organization/*` path gets the global
  100 requests per 10 s. The limiter's key is **IP plus path**, never the user, and `customRules` can
  change only the window and the maximum. So D6's "10 per 60 s per user" is two pieces: a
  `customRules['/organization/invite-member']` rule of 10 per 60 s per IP, which also covers `resend`,
  and a count in `beforeCreateInvitation` of the inviter's invitations in the last 60 s. A resend makes
  no row and escapes that count, but not the IP rule.

## Other findings

- **Slug format is not checked**: `"Has Spaces/And?Query"` was accepted. Step 4 validates name and slug
  with the step 3 schemas in `beforeCreateOrganization` and `beforeUpdateOrganization`.
- **D7, "only an owner deletes"**: the plugin checks `organization:delete`, which an owner can put in a
  custom role. Either the statements given to custom roles leave out `organization:delete`, or
  `beforeDeleteOrganization` checks that the caller holds `owner`. The typed name of D7 is a web check
  only. Deleting an organization removes its members, invitations and custom roles (cascade) and
  clears `activeOrganizationId` of the caller's session only.
- `addMember` has no HTTP route; it is server only and checks no permission.
- `accept-invitation` and `create` set `activeOrganizationId`; `get-full-organization` and
  `set-active` clear it for a non-member, so a `GET` there can write. None of it matters under D1.
- Plugin error statuses are uneven (400 for most refusals, 401 for "not a member" on `has-permission`,
  401 on `remove-member` without permission). The web maps codes, not statuses.

## What changes in the plan

1. Step 4 gains: the two unique indexes; the no-escalation check on invite and on role change;
   refusing rename or delete of a role in use (members or pending invitations); slug and name
   validation; the per-user invite count beside the IP rule; the owner check on delete. Each with a
   `.db.test` through HTTP.
2. Step 5: the adapter reads `member` and `organizationRole` with Kysely; it does not call the plugin's
   `hasPermission`.
3. Step 13 says "Invite form (email, any role)". It becomes "any role whose permissions the inviter
   holds", and the role picker disables the others with the reason, as step 12 does.
4. Step 8 filters expired invitations out of the pending list.
