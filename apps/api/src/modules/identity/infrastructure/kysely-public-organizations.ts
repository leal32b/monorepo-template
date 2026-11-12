import type { Kysely } from 'kysely'
import type { PublicOrganization, PublicOrganizations } from '../public-organizations.port'

type OrganizationTable = { organization: PublicOrganization }

/**
 * Read straight from the organization plugin's table, on the pool (ADR 0059): one indexed query, and
 * only the columns a public route may use. The tenant role has nothing on the `auth` schema, so the
 * lookup happens before the unit of work, never inside it.
 */
export class KyselyPublicOrganizations implements PublicOrganizations {
  readonly #db: Kysely<OrganizationTable>

  constructor(db: Kysely<unknown>) {
    this.#db = (db as unknown as Kysely<OrganizationTable>).withSchema('auth')
  }

  async bySlug(slug: string): Promise<PublicOrganization | null> {
    const row = await this.#db
      .selectFrom('organization')
      .select(['id', 'name', 'slug', 'timeZone', 'currency'])
      .where('slug', '=', slug)
      .executeTakeFirst()
    return row ?? null
  }
}
