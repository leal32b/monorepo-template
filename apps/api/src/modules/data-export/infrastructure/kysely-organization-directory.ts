import { type Kysely, sql } from 'kysely'
import type { Locale } from '#libs/notifications/locales'
import { memberUserColumns, pluginTables } from '../database/export-tables'
import { cellOf, headerOf } from '../database/export-values'
import type { ExportTable } from '../export-table'
import type { DirectoryRead, OrganizationDirectory } from '../organization-directory.port'

type Row = Record<string, unknown>

/**
 * Better Auth's tables of the organization (ADR 0074), read on the pool as their owner, as
 * `KyselyOrganizationOwners` reads them (ADR 0073): the tenant role has nothing on schema `auth`. Every query
 * names the organization and its columns one by one, from `pluginTables`.
 */
export class KyselyOrganizationDirectory implements OrganizationDirectory {
  readonly #db: Kysely<unknown>

  constructor(db: Kysely<unknown>) {
    this.#db = db
  }

  async read(organizationId: string, requesterId: string): Promise<DirectoryRead | null> {
    const tables: ExportTable[] = []
    for (const spec of pluginTables) {
      const own = spec.columns.map((column) => sql.ref(`t.${column}`))
      const joined = spec.file === 'members'
      const user = joined ? memberUserColumns.map((column) => sql.ref(`u.${column}`)) : []
      const { rows } = await sql<Row>`
        select ${sql.join([...own, ...user])}
        from ${sql.table(`auth.${spec.table}`)} as t
        ${joined ? sql`join auth."user" as u on u.id = t."userId"` : sql``}
        where ${sql.ref(`t.${spec.organizationColumn}`)} = ${organizationId}
        order by ${sql.ref(`t.${spec.orderBy}`)}, t.id
      `.execute(this.#db)
      const columns: readonly string[] = joined ? [...spec.columns, ...memberUserColumns] : spec.columns
      tables.push({
        name: spec.file,
        columns: columns.map(headerOf),
        rows: rows.map((row) => columns.map((column) => cellOf(row[column])))
      })
    }
    const organization = tables[0]?.rows[0]
    if (organization === undefined) return null
    const [, name, slug, timeZone] = organization as [string, string, string, string]
    return {
      tables,
      organization: { name, slug, timeZone },
      requester: await this.#requester(organizationId, requesterId)
    }
  }

  /** The owner who asked, while still an owner: an admin cannot download it. */
  async #requester(organizationId: string, userId: string): Promise<DirectoryRead['requester']> {
    const { rows } = await sql<{ email: string; locale: Locale }>`
      select u.email, u.locale from auth.member m join auth."user" u on u.id = m."userId"
      where m."organizationId" = ${organizationId} and m."userId" = ${userId}
        and 'owner' = any(string_to_array(replace(m.role, ' ', ''), ','))
    `.execute(this.#db)
    return rows[0] ?? null
  }
}
