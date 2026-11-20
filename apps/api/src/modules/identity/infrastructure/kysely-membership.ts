import { accessOf, entitlementsOf } from '@repo/contracts'
import type { Kysely } from 'kysely'
import type { Clock } from '#libs/ports/clock.port'
import type { Member, Membership } from '../membership.port'
import { OrganizationReader } from './organization-rules'

/**
 * Membership read straight from the organization plugin's tables (ADR 0033): the member row, the
 * organization's custom roles and its subscription in one query. It never reads the session's active
 * organization. What the subscription lets members do is computed with the API's clock (ADR 0063).
 */
type MemberTables = {
  member: { organizationId: string; userId: string }
  user: { id: string; name: string }
  'public.operator': { user_id: string }
}

export class KyselyMembership implements Membership {
  readonly #reader: OrganizationReader
  readonly #db: Kysely<MemberTables>
  readonly #clock: Clock

  constructor(db: Kysely<unknown>, clock: Clock) {
    this.#reader = new OrganizationReader(db)
    this.#db = (db as unknown as Kysely<MemberTables>).withSchema('auth')
    this.#clock = clock
  }

  async memberOf(organizationId: string, userId: string): Promise<Member | null> {
    const now = this.#clock.now()
    const member = await this.#reader.memberOf(organizationId, userId, now)
    if (member === undefined) return null
    const { subscription, impersonationEndsAt } = member
    return {
      userId,
      organizationId,
      roles: member.roles.split(',').map((role) => role.trim()),
      permissions: member.permissions,
      subscription: { ...subscription, access: accessOf(subscription, now) },
      entitlements: entitlementsOf(subscription),
      ...(impersonationEndsAt === undefined ? {} : { impersonation: { endsAt: impersonationEndsAt } })
    }
  }

  async namesOf(organizationId: string, userIds: readonly string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()
    const rows = await this.#db
      .selectFrom('member')
      .innerJoin('user', 'user.id', 'member.userId')
      .select(['user.id', 'user.name'])
      .where('member.organizationId', '=', organizationId)
      .where('member.userId', 'in', [...userIds])
      .execute()
    return new Map(rows.map((row) => [row.id, row.name]))
  }

  async operatorNamesOf(userIds: readonly string[]): Promise<Map<string, string>> {
    const rows = await this.#db
      .selectFrom('user')
      .select(['user.id', 'user.name'])
      .where('user.id', 'in', [...userIds])
      .where((eb) => eb.exists(eb.selectFrom('public.operator').select('user_id').whereRef('user_id', '=', 'user.id')))
      .execute()
    return new Map(rows.map((row) => [row.id, row.name]))
  }
}
