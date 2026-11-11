import { type Kysely, sql } from 'kysely'

/**
 * Tables outside the tenant net (ADR 0055), as `schema.table`: one that has an `organization_id`
 * column, or that the tenant role may read or write, without row-level security enabled and a policy
 * for that role. Empty when every tenant table is protected.
 */
export async function unprotectedTenantTables(db: Kysely<unknown>): Promise<string[]> {
  const { rows } = await sql<{ name: string }>`
    select n.nspname || '.' || c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname not in ('pg_catalog', 'information_schema')
      and (
        exists (
          select from pg_attribute a
          where a.attrelid = c.oid and a.attname = 'organization_id' and not a.attisdropped
        )
        or has_table_privilege('app_tenant', c.oid, 'select, insert, update, delete, truncate')
      )
      and not (
        c.relrowsecurity
        and exists (
          select from pg_policy p
          where p.polrelid = c.oid and p.polroles @> array[(select oid from pg_roles where rolname = 'app_tenant')]
        )
      )
    order by name
  `.execute(db)
  return rows.map((row) => row.name)
}
