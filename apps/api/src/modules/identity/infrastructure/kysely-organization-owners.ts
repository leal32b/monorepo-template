import { type Kysely, sql } from 'kysely'
import type { Locale } from '#libs/notifications/locales'
import type { OrganizationOwner, OrganizationOwners } from '../organization-owners.port'

type OwnerTables = {
  organization: { id: string; name: string; slug: string; timeZone: string }
  member: { organizationId: string; userId: string; role: string; createdAt: Date }
  user: { id: string; email: string; locale: Locale }
}

/**
 * Read straight from the plugin's tables, on the pool as their owner (ADR 0059): the tenant role has
 * nothing on the `auth` schema, so it runs before a unit of work, never inside it. A member's roles are
 * comma separated (ADR 0033); the oldest owner is the one written to.
 */
export class KyselyOrganizationOwners implements OrganizationOwners {
  readonly #db: Kysely<OwnerTables>

  constructor(db: Kysely<unknown>) {
    this.#db = (db as unknown as Kysely<OwnerTables>).withSchema('auth')
  }

  async ownerOf(organizationId: string): Promise<OrganizationOwner | null> {
    const row = await this.#db
      .selectFrom('member')
      .innerJoin('user', 'user.id', 'member.userId')
      .innerJoin('organization', 'organization.id', 'member.organizationId')
      .select(['user.email', 'user.locale', 'organization.name', 'organization.slug', 'organization.timeZone'])
      .where('member.organizationId', '=', organizationId)
      .where(sql<boolean>`'owner' = any(string_to_array(replace(member.role, ' ', ''), ','))`)
      .orderBy('member.createdAt')
      .limit(1)
      .executeTakeFirst()
    if (row === undefined) return null
    const { email, locale, name, slug, timeZone } = row
    return { email, locale, organization: { name, slug, timeZone } }
  }
}
