import type { Kysely } from 'kysely'
import type { Member, Membership } from '../membership.port'
import { OrganizationReader } from './organization-rules'

/**
 * Membership read straight from the organization plugin's tables (ADR 0033): two reads, the member
 * row and the organization's custom roles. It never reads the session's active organization.
 */
export class KyselyMembership implements Membership {
  readonly #reader: OrganizationReader

  constructor(db: Kysely<unknown>) {
    this.#reader = new OrganizationReader(db)
  }

  async memberOf(organizationId: string, userId: string): Promise<Member | null> {
    const roles = await this.#reader.rolesOf(organizationId, { userId })
    if (roles === undefined) return null
    return {
      userId,
      organizationId,
      roles: roles.split(',').map((role) => role.trim()),
      permissions: await this.#reader.permissionsOf(organizationId, roles)
    }
  }
}
