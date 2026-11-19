import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { KyselyOrganizationOwners } from './kysely-organization-owners'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))

describe('KyselyOrganizationOwners (ADR 0073)', () => {
  const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
  const owners = new KyselyOrganizationOwners(db)

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    await sql`insert into auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt", locale)
      values ('user-ada', 'Ada', 'ada@example.com', true, now(), now(), 'pt-BR'),
             ('user-bea', 'Bea', 'bea@example.com', true, now(), now(), 'es'),
             ('user-cid', 'Cid', 'cid@example.com', true, now(), now(), 'en')`.execute(db)
    await sql`insert into auth.organization (id, name, slug, "createdAt", "timeZone", currency)
      values ('org-acme', 'Acme Barbers', 'acme', now(), 'America/Sao_Paulo', 'BRL'),
             ('org-solo', 'Solo', 'solo', now(), 'UTC', 'USD')`.execute(db)
    await sql`insert into auth.member (id, "organizationId", "userId", role, "createdAt")
      values ('member-cid', 'org-acme', 'user-cid', 'admin', '2026-01-01T00:00:00Z'),
             ('member-bea', 'org-acme', 'user-bea', 'admin,owner', '2026-03-01T00:00:00Z'),
             ('member-ada', 'org-acme', 'user-ada', 'owner', '2026-02-01T00:00:00Z'),
             ('member-cid-solo', 'org-solo', 'user-cid', 'member', now())`.execute(db)
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('finds the oldest owner, with their language, and the organization’s name, slug and time zone', async () => {
    expect(await owners.ownerOf('org-acme')).toEqual({
      email: 'ada@example.com',
      locale: 'pt-BR',
      organization: { name: 'Acme Barbers', slug: 'acme', timeZone: 'America/Sao_Paulo' }
    })
  })

  it('finds none for an organization without an owner, nor for one that is gone', async () => {
    expect(await owners.ownerOf('org-solo')).toBeNull()
    expect(await owners.ownerOf('org-gone')).toBeNull()
  })
})
