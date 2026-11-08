import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { identityRetention, purgeExpiredIdentityRows } from './purge-expired'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const now = new Date('2026-11-08T12:00:00.000Z')
const hours = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000)
const days = (n: number) => hours(n * 24)

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
})

beforeEach(async () => {
  await sql`truncate auth."user", auth.organization, auth.verification, auth."rateLimit" cascade`.execute(db)
})

afterAll(() => db.destroy())

const user = (id: string, verified: boolean, createdAt: Date) =>
  sql`insert into auth."user" (id, name, email, "emailVerified", "createdAt", locale)
      values (${id}, ${id}, ${`${id}@example.com`}, ${verified}, ${createdAt}, 'en')`.execute(db)

const session = (id: string, userId: string, expiresAt: Date) =>
  sql`insert into auth.session (id, "expiresAt", token, "updatedAt", "userId")
      values (${id}, ${expiresAt}, ${id}, ${now}, ${userId})`.execute(db)

const verification = (id: string, expiresAt: Date) =>
  sql`insert into auth.verification (id, identifier, value, "expiresAt") values (${id}, ${id}, 'v', ${expiresAt})`.execute(
    db
  )

const rateLimit = (id: string, lastRequest: Date) =>
  sql`insert into auth."rateLimit" (id, key, count, "lastRequest") values (${id}, ${id}, 1, ${lastRequest.getTime()})`.execute(
    db
  )

const invitation = (id: string, status: string, expiresAt: Date) =>
  sql`insert into auth.invitation (id, "organizationId", email, status, "expiresAt", "inviterId")
      values (${id}, 'org', 'someone@example.com', ${status}, ${expiresAt}, 'kept')`.execute(db)

const ids = async (table: string) =>
  (await sql<{ id: string }>`select id from ${sql.table(`auth.${table}`)} order by id`.execute(db)).rows.map(
    (row) => row.id
  )

describe('purgeExpiredIdentityRows', () => {
  it('deletes what is past its use and keeps everything else', async () => {
    const unconfirmedFor = identityRetention.unconfirmedAccountDays
    await user('kept', true, days(-365))
    await user('unconfirmed-old', false, days(-unconfirmedFor - 1))
    await user('unconfirmed-new', false, days(-unconfirmedFor + 1))
    await sql`insert into auth.organization (id, name, slug, "createdAt") values ('org', 'Org', 'org', ${now})`.execute(
      db
    )
    await session('expired', 'kept', hours(-1))
    await session('live', 'kept', hours(1))
    await session('of-unconfirmed', 'unconfirmed-old', hours(1))
    await verification('expired', hours(-1))
    await verification('live', hours(1))
    await rateLimit('stale', hours(-identityRetention.rateLimitHours - 1))
    await rateLimit('recent', hours(-1))
    const invitationsFor = identityRetention.expiredInvitationDays
    await invitation('pending-long-expired', 'pending', days(-invitationsFor - 1))
    await invitation('pending-just-expired', 'pending', days(-1))
    await invitation('pending-live', 'pending', days(1))
    await invitation('accepted-long-ago', 'accepted', days(-invitationsFor - 1))

    const removed = await purgeExpiredIdentityRows(db, now)

    expect(removed).toEqual({ unconfirmedAccounts: 1, sessions: 1, verifications: 1, rateLimits: 1, invitations: 1 })
    expect(await ids('user')).toEqual(['kept', 'unconfirmed-new'])
    expect(await ids('session')).toEqual(['live'])
    expect(await ids('verification')).toEqual(['live'])
    expect(await ids('rateLimit')).toEqual(['recent'])
    expect(await ids('invitation')).toEqual(['accepted-long-ago', 'pending-just-expired', 'pending-live'])
  })

  it('finds nothing to do when run again', async () => {
    await user('kept', true, days(-1))
    await session('expired', 'kept', hours(-1))
    await purgeExpiredIdentityRows(db, now)

    expect(await purgeExpiredIdentityRows(db, now)).toEqual({
      unconfirmedAccounts: 0,
      sessions: 0,
      verifications: 0,
      rateLimits: 0,
      invitations: 0
    })
  })

  it('works through a backlog larger than one batch', async () => {
    for (const id of ['a', 'b', 'c', 'd', 'e']) await verification(id, hours(-1))
    await verification('live', hours(1))

    expect((await purgeExpiredIdentityRows(db, now, { batchSize: 2 })).verifications).toBe(5)
    expect(await ids('verification')).toEqual(['live'])
  })
})
