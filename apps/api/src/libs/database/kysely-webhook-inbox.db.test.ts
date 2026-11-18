import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import * as z from 'zod/mini'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import type { JobDefinition } from '#libs/ports/job-queue.port'
import { resetDatabase } from '../../../test/reset-database'
import { createDatabase, createPool } from './database'
import { KyselyJobs } from './kysely-jobs'
import { KyselyWebhookInbox, purgeWebhookEvents, webhookEventRetention } from './kysely-webhook-inbox'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const clock = new FixedClock(new Date('2026-11-19T12:00:00.000Z'))
const sync: JobDefinition<{ provider: string; subscriptionId: string }> = {
  kind: 'test.sync',
  schema: z.object({ provider: z.string(), subscriptionId: z.string() })
}
type Notice = { eventId: string; subscriptionId: string }

const inbox = (job = sync) =>
  new KyselyWebhookInbox<Notice, { provider: string; subscriptionId: string }>({
    db,
    clock,
    jobsOn: (transaction) => new KyselyJobs(transaction, new UuidGenerator(), clock),
    job,
    payloadOf: (source, notice) => ({ provider: source, subscriptionId: notice.subscriptionId })
  })

const jobs = async () => (await sql<{ kind: string; payload: unknown }>`select kind, payload from job`.execute(db)).rows
const events = async () =>
  (
    await sql<{
      source: string
      event_id: string
    }>`select source, event_id from webhook_event order by event_id`.execute(db)
  ).rows

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
})

beforeEach(async () => {
  await sql`truncate job, webhook_event`.execute(db)
})

afterAll(() => db.destroy())

describe('KyselyWebhookInbox (ADR 0063)', () => {
  it('records a new event and enqueues its job, with the payload the composition root makes', async () => {
    expect(await inbox().receive('fake', { eventId: 'evt_1', subscriptionId: 'sub_1' })).toBe(true)

    expect(await events()).toEqual([{ source: 'fake', event_id: 'evt_1' }])
    expect(await jobs()).toEqual([{ kind: 'test.sync', payload: { provider: 'fake', subscriptionId: 'sub_1' } }])
  })

  it('enqueues nothing for an event already received, from the same provider', async () => {
    await inbox().receive('fake', { eventId: 'evt_1', subscriptionId: 'sub_1' })

    expect(await inbox().receive('fake', { eventId: 'evt_1', subscriptionId: 'sub_1' })).toBe(false)
    expect(await inbox().receive('asaas', { eventId: 'evt_1', subscriptionId: 'sub_1' })).toBe(true)
    expect(await jobs()).toHaveLength(2)
  })

  it('keeps no event whose job could not be enqueued, so the provider sends it again', async () => {
    const broken = { ...sync, schema: z.object({ never: z.string() }) } as unknown as typeof sync

    await expect(inbox(broken).receive('fake', { eventId: 'evt_1', subscriptionId: 'sub_1' })).rejects.toThrow(
      'invalid payload'
    )

    expect(await events()).toEqual([])
    expect(await jobs()).toEqual([])
  })
})

describe('purgeWebhookEvents (ADR 0050)', () => {
  it(`deletes the event ids older than ${webhookEventRetention.days} days, and keeps the others`, async () => {
    const day = 24 * 60 * 60 * 1000
    const at = (daysAgo: number) => new Date(clock.now().getTime() - daysAgo * day)
    await sql`
      insert into webhook_event (source, event_id, received_at)
      values ('fake', 'old', ${at(31)}), ('fake', 'edge', ${at(29)}), ('fake', 'new', ${at(0)})
    `.execute(db)

    expect(await purgeWebhookEvents(db, clock.now())).toBe(1)
    expect((await events()).map((event) => event.event_id)).toEqual(['edge', 'new'])
  })
})
