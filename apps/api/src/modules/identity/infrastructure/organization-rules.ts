import {
  builtInRoles,
  covers,
  organizationNameSchema,
  organizationSlugSchema,
  ownerOnlyPermissions,
  type Permissions,
  permissionsSchema,
  roleNameSchema
} from '@repo/contracts'
import { APIError } from 'better-auth/api'
import { type Kysely, sql } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/postgres'

/** The plugin's tables, as far as these rules read them (`migrations/0003_organizations.sql`). */
type OrganizationTables = {
  member: { id: string; organizationId: string; userId: string; role: string }
  organizationRole: { id: string; organizationId: string; role: string; permission: string }
  invitation: {
    organizationId: string
    inviterId: string
    role: string | null
    status: string
    expiresAt: Date
    createdAt: Date
  }
  user: { id: string; email: string }
}

/**
 * The limits of ADR 0033 (D6), in one place: a product changes them here.
 * `invitationsPerMinute` applies per inviter and per client address.
 */
export const organizationLimits = {
  organizationsPerUser: 5,
  membersPerOrganization: 100,
  customRolesPerOrganization: 20,
  invitationsPerMinute: 10,
  invitationExpiresInDays: 7
}

/** Refusals the web maps by `code`, beside the plugin's own. */
const refuse = (status: 'BAD_REQUEST' | 'FORBIDDEN' | 'TOO_MANY_REQUESTS', code: string, message: string) =>
  new APIError(status, { code, message })

/** A custom role's stored permissions; anything that is not a valid `Permissions` grants nothing. */
export function parseRolePermission(stored: string): Permissions {
  const parsed = permissionsSchema.safeParse(JSON.parse(stored))
  return parsed.success ? parsed.data : {}
}

/** What a member's comma-separated roles hold: the union of built-in and custom roles; unknown names grant nothing. */
export function permissionsOfRoles(roles: string, custom: ReadonlyMap<string, Permissions>): Permissions {
  const held = new Map<string, Set<string>>()
  for (const name of roles.split(',').map((role) => role.trim())) {
    const granted: Permissions = Object.hasOwn(builtInRoles, name)
      ? builtInRoles[name as keyof typeof builtInRoles]
      : (custom.get(name) ?? {})
    for (const [resource, actions] of Object.entries(granted)) {
      const set = held.get(resource) ?? new Set<string>()
      // A resource is present only with its actions: neither the roles nor the schema write `undefined`.
      for (const action of actions as readonly string[]) set.add(action)
      held.set(resource, set)
    }
  }
  return Object.fromEntries([...held].map(([resource, actions]) => [resource, [...actions]])) as Permissions
}

/** Whether `permission` holds any of the owner's own permissions, which no custom role may hold. */
export function holdsOwnerOnlyPermission(permission: Record<string, readonly string[]>): boolean {
  return Object.entries(ownerOnlyPermissions).some(([resource, actions]) =>
    actions.some((action) => permission[resource]?.includes(action))
  )
}

/** Reads memberships and roles straight from the plugin's tables, as the guard of ADR 0033 does. */
export class OrganizationReader {
  readonly #db: Kysely<OrganizationTables>

  constructor(db: Kysely<unknown>) {
    this.#db = (db as unknown as Kysely<OrganizationTables>).withSchema('auth')
  }

  /** What `roles` hold in `organizationId`, its custom roles included. */
  async permissionsOf(organizationId: string, roles: string): Promise<Permissions> {
    const rows = await this.#db
      .selectFrom('organizationRole')
      .select(['role', 'permission'])
      .where('organizationId', '=', organizationId)
      .execute()
    return permissionsOfRoles(roles, new Map(rows.map((row) => [row.role, parseRolePermission(row.permission)])))
  }

  /**
   * A member's roles and what they hold, in one round trip: the organization's custom roles come with
   * the member row, so a non-member costs the same single query and no permission work.
   */
  async memberOf(
    organizationId: string,
    userId: string
  ): Promise<{ roles: string; permissions: Permissions } | undefined> {
    const row = await this.#db
      .selectFrom('member')
      .select((eb) => [
        'member.role',
        jsonArrayFrom(
          eb
            .selectFrom('organizationRole')
            .select(['organizationRole.role', 'organizationRole.permission'])
            .whereRef('organizationRole.organizationId', '=', 'member.organizationId')
        ).as('customRoles')
      ])
      .where('member.organizationId', '=', organizationId)
      .where('member.userId', '=', userId)
      .executeTakeFirst()
    if (row === undefined) return undefined
    const custom = new Map(row.customRoles.map((custom) => [custom.role, parseRolePermission(custom.permission)]))
    return { roles: row.role, permissions: permissionsOfRoles(row.role, custom) }
  }

  /** The roles of a member of `organizationId`, found by user id, member id or email; undefined if none. */
  async rolesOf(
    organizationId: string,
    who: { userId: string } | { memberIdOrEmail: string }
  ): Promise<string | undefined> {
    const row = await this.#db
      .selectFrom('member')
      .innerJoin('user', 'user.id', 'member.userId')
      .select('member.role')
      .where('member.organizationId', '=', organizationId)
      .where((eb) =>
        'userId' in who
          ? eb('member.userId', '=', who.userId)
          : eb.or([
              eb('member.id', '=', who.memberIdOrEmail),
              eb(eb.fn('lower', ['user.email']), '=', who.memberIdOrEmail.toLowerCase())
            ])
      )
      .executeTakeFirst()
    return row?.role
  }

  /** Whether a member or a live pending invitation holds the custom role named, or with the id given. */
  async isRoleInUse(organizationId: string, role: { roleName?: string; roleId?: string }): Promise<boolean> {
    const name = this.#db
      .selectFrom('organizationRole')
      .select('role')
      .where('organizationId', '=', organizationId)
      .where((eb) => eb.or([eb('role', '=', role.roleName ?? ''), eb('id', '=', role.roleId ?? '')]))
    const holds = (column: 'member.role' | 'invitation.role') =>
      sql<boolean>`',' || replace(${sql.ref(column)}, ' ', '') || ',' like '%,' || (${name}) || ',%'`
    const { members, invitations } = await this.#db
      .selectNoFrom((eb) => [
        eb
          .selectFrom('member')
          .select((count) => count.fn.countAll<string>().as('n'))
          .where('member.organizationId', '=', organizationId)
          .where(holds('member.role'))
          .as('members'),
        eb
          .selectFrom('invitation')
          .select((count) => count.fn.countAll<string>().as('n'))
          .where('invitation.organizationId', '=', organizationId)
          .where('invitation.status', '=', 'pending')
          .where('invitation.expiresAt', '>', sql<Date>`now()`)
          .where(holds('invitation.role'))
          .as('invitations')
      ])
      .executeTakeFirstOrThrow()
    return Number(members) + Number(invitations) > 0
  }

  /** How many invitations `inviterId` created in the last minute. */
  async recentInvitationsBy(inviterId: string): Promise<number> {
    const { n } = await this.#db
      .selectFrom('invitation')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('inviterId', '=', inviterId)
      .where('createdAt', '>', sql<Date>`now() - interval '1 minute'`)
      .executeTakeFirstOrThrow()
    return Number(n)
  }
}

/** The plugin's write paths these rules guard, with the body each one takes. */
type GuardedBody = {
  organizationId?: unknown
  role?: string | string[]
  memberId?: string
  memberIdOrEmail?: string
  permission?: Record<string, string[]>
  roleName?: string
  roleId?: string
  data?: { roleName?: string; permission?: Record<string, string[]> }
}

/**
 * The checks ADR 0033 adds around the organization plugin, run before its endpoints:
 * a role is given only by someone who holds all of it, nobody acts on a member above them, custom
 * roles never hold the owner's permissions, and a role in use keeps its name. Without a session, or
 * for a caller or a target who is not a member, they let the request through for the plugin to answer.
 */
export class OrganizationRules {
  readonly #reader: OrganizationReader

  constructor(reader: OrganizationReader) {
    this.#reader = reader
  }

  static readonly guardedPaths = new Set([
    '/organization/invite-member',
    '/organization/update-member-role',
    '/organization/remove-member',
    '/organization/create-role',
    '/organization/update-role',
    '/organization/delete-role'
  ])

  async before(path: string, body: GuardedBody, actorUserId: string | undefined): Promise<void> {
    const { organizationId } = body
    // D1: the tenant comes from the request, never from the session's active organization.
    if (typeof organizationId !== 'string') {
      throw refuse('BAD_REQUEST', 'ORGANIZATION_ID_REQUIRED', 'Send the organization id')
    }
    if (path === '/organization/create-role') return this.#checkRoleDefinition(body.role as string, body.permission)
    if (path === '/organization/update-role') {
      // The plugin's schema requires `data` on this path.
      const { roleName, permission } = body.data as NonNullable<GuardedBody['data']>
      this.#checkRoleDefinition(roleName, permission)
      if (roleName !== undefined && (await this.#reader.isRoleInUse(organizationId, body))) throw this.#roleInUse()
      return
    }
    if (path === '/organization/delete-role') {
      if (await this.#reader.isRoleInUse(organizationId, body)) throw this.#roleInUse()
      return
    }

    const actorRoles =
      actorUserId === undefined ? undefined : await this.#reader.rolesOf(organizationId, { userId: actorUserId })
    if (actorRoles === undefined) return
    const held = await this.#reader.permissionsOf(organizationId, actorRoles)

    if (path !== '/organization/invite-member') {
      const target = await this.#reader.rolesOf(organizationId, {
        memberIdOrEmail: body.memberId ?? (body.memberIdOrEmail as string)
      })
      if (target === undefined) return
      if (!covers(held, await this.#reader.permissionsOf(organizationId, target))) {
        throw refuse('FORBIDDEN', 'MEMBER_OUTRANKS_YOU', 'This member holds permissions you do not')
      }
      if (path === '/organization/remove-member') return
    }
    const given = [body.role as string | string[]].flat().join(',')
    if (!covers(held, await this.#reader.permissionsOf(organizationId, given))) {
      throw refuse('FORBIDDEN', 'ROLE_EXCEEDS_YOUR_PERMISSIONS', 'This role holds permissions you do not')
    }
  }

  /** Before an invitation row is written: the per-inviter rate of D6. */
  async beforeInvitation(inviterId: string): Promise<void> {
    if ((await this.#reader.recentInvitationsBy(inviterId)) >= organizationLimits.invitationsPerMinute) {
      throw refuse('TOO_MANY_REQUESTS', 'TOO_MANY_INVITATIONS', 'Too many invitations; try again in a minute')
    }
  }

  /** Before an organization is deleted: only an owner, whatever custom role the caller holds (D7). */
  async beforeDeletion(organizationId: string, userId: string): Promise<void> {
    // The plugin has already refused a caller who is not a member.
    const roles = (await this.#reader.rolesOf(organizationId, { userId })) as string
    if (!roles.split(',').includes('owner')) {
      throw refuse('FORBIDDEN', 'ONLY_AN_OWNER_DELETES', 'Only an owner can delete the organization')
    }
    // Phase 7: a product module deletes its records of the organization here.
  }

  #checkRoleDefinition(name: string | undefined, permission: Record<string, string[]> | undefined): void {
    if (name !== undefined && !roleNameSchema.safeParse(name).success) {
      throw refuse('BAD_REQUEST', 'INVALID_ROLE_NAME', 'Use lowercase letters, digits and hyphens')
    }
    if (permission !== undefined && holdsOwnerOnlyPermission(permission)) {
      throw refuse('BAD_REQUEST', 'OWNER_ONLY_PERMISSION', 'Only the owner role can delete the organization')
    }
  }

  #roleInUse() {
    return refuse('BAD_REQUEST', 'ROLE_IN_USE', 'Members or pending invitations hold this role')
  }
}

/** Name and slug of an organization, on create and on update (each only when it is sent). */
export function checkOrganization({ name, slug }: { name?: unknown; slug?: unknown }): void {
  if (name !== undefined && !organizationNameSchema.safeParse(name).success) {
    throw refuse('BAD_REQUEST', 'INVALID_ORGANIZATION_NAME', 'Give the organization a name of 1 to 80 characters')
  }
  if (slug !== undefined && !organizationSlugSchema.safeParse(slug).success) {
    throw refuse('BAD_REQUEST', 'INVALID_ORGANIZATION_SLUG', 'Use lowercase letters, digits and single hyphens')
  }
}
