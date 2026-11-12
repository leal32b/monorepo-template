import type { Kysely } from 'kysely'
import type { Member, Membership } from '../membership.port'
import { OrganizationReader } from './organization-rules'

/**
 * Membership read straight from the organization plugin's tables (ADR 0033): the member row and the
 * organization's custom roles in one query. It never reads the session's active organization.
 */
type MemberTables = {
  member: { organizationId: string; userId: string }
  user: { id: string; name: string }
}

export class KyselyMembership implements Membership {
  readonly #reader: OrganizationReader
  readonly #db: Kysely<MemberTables>

  constructor(db: Kysely<unknown>) {
    this.#reader = new OrganizationReader(db)
    this.#db = (db as unknown as Kysely<MemberTables>).withSchema('auth')
  }

  async memberOf(organizationId: string, userId: string): Promise<Member | null> {
    const member = await this.#reader.memberOf(organizationId, userId)
    if (member === undefined) return null
    return {
      userId,
      organizationId,
      roles: member.roles.split(',').map((role) => role.trim()),
      permissions: member.permissions
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
}
