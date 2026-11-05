import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { KyselyMembership } from './kysely-membership'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))

describe('KyselyMembership (ADR 0033)', () => {
  const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
  const membership = new KyselyMembership(db)

  beforeAll(async () => {
    await sql.raw('drop schema if exists auth cascade; drop table if exists schema_migration').execute(db)
    await runMigrations(db, migrations)
    await sql`insert into auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt", locale)
      values ('user-ada', 'Ada', 'ada@example.com', true, now(), now(), 'en'),
             ('user-bob', 'Bob', 'bob@example.com', true, now(), now(), 'en')`.execute(db)
    await sql`insert into auth.organization (id, name, slug, "createdAt")
      values ('org-acme', 'Acme', 'acme', now()), ('org-other', 'Other', 'other', now())`.execute(db)
    await sql`insert into auth."organizationRole" (id, "organizationId", role, permission)
      values ('role-editor', 'org-acme', 'editor', '{"invitation":["create"],"ac":["update"]}'),
             ('role-elsewhere', 'org-other', 'editor', '{"organization":["update"]}')`.execute(db)
    await sql`insert into auth.member (id, "organizationId", "userId", role, "createdAt")
      values ('member-ada', 'org-acme', 'user-ada', 'member,editor', now()),
             ('member-bob', 'org-other', 'user-bob', 'owner', now())`.execute(db)
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('resolves built-in and custom roles of the organization into one set of permissions', async () => {
    expect(await membership.memberOf('org-acme', 'user-ada')).toEqual({
      userId: 'user-ada',
      organizationId: 'org-acme',
      roles: ['member', 'editor'],
      permissions: { ac: ['read', 'update'], invitation: ['create'] }
    })
  })

  it('finds nobody in an organization the user is not in, nor in one that does not exist', async () => {
    expect(await membership.memberOf('org-other', 'user-ada')).toBeNull()
    expect(await membership.memberOf('org-missing', 'user-ada')).toBeNull()
  })
})
