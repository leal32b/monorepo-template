import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { KyselyPublicOrganizations } from './kysely-public-organizations'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))

describe('KyselyPublicOrganizations (ADR 0059)', () => {
  const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
  const organizations = new KyselyPublicOrganizations(db)

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    await sql`insert into auth.organization (id, name, slug, "createdAt", "timeZone", currency, logo, metadata)
      values ('org-acme', 'Acme Barbers', 'acme', now(), 'America/Sao_Paulo', 'BRL', 'https://example.com/logo.png', '{"plan":"pro"}'),
             ('org-other', 'Other', 'other', now(), 'UTC', 'USD', null, null)`.execute(db)
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('finds an organization by its slug, with what a public route needs and nothing else', async () => {
    expect(await organizations.bySlug('acme')).toEqual({
      id: 'org-acme',
      name: 'Acme Barbers',
      slug: 'acme',
      timeZone: 'America/Sao_Paulo',
      currency: 'BRL'
    })
  })

  it('finds none for a slug nobody has, nor for an id', async () => {
    expect(await organizations.bySlug('nobody')).toBeNull()
    expect(await organizations.bySlug('org-acme')).toBeNull()
  })
})
