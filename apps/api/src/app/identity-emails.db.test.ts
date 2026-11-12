import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { retryDelayMs } from '#libs/jobs/job-limits'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'
import { resetDatabase } from '../../test/reset-database'
import { createApp } from './create-app'
import { createJobs } from './create-jobs'

const webOrigin = 'http://localhost:5173'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))

/** A provider that refuses the next `failures` messages, then delivers. */
class FlakyEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = []
  failures = 0

  async send(message: EmailMessage): Promise<void> {
    if (this.failures > 0) {
      this.failures -= 1
      throw new Error('Resend refused the email: 503 internal_server_error')
    }
    this.sent.push(message)
  }
}

describe('identity emails through the job queue (ADR 0057)', () => {
  const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
  const clock = new FixedClock(new Date('2026-11-11T12:00:00.000Z'))
  const { logger, lines } = memoryLogger()
  const email = new FlakyEmailSender()
  const jobs = createJobs({ db, clock, logger, emailSender: email, timer: new ManualTimer(clock), idlePollMs: 1 })
  let server: Server
  let url: string
  let lastAccount = 0

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    server = createApp({
      clock,
      logger: pino({ level: 'silent' }),
      serviceName: 'api',
      release: 'test',
      webOrigin,
      corsOrigins: [],
      proxySecret: undefined,
      db,
      jobs: jobs.queue,
      authSecret: 'fedcba9876543210'.repeat(2),
      google: undefined
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  beforeEach(async () => {
    await sql`truncate job`.execute(db)
    const realFetch = globalThis.fetch
    // The breach check calls out with `fetch`: no password here is breached.
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) =>
      String(input).startsWith('https://api.pwnedpasswords.com/range/') ? new Response('') : realFetch(input, init)
    )
    lines.length = 0
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  /** Signs up a new address: Better Auth asks for its confirmation email. */
  async function signUp(): Promise<string> {
    const address = `flaky-${++lastAccount}@example.com`
    const response = await fetch(`${url}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { Origin: webOrigin, 'X-Client-IP': `198.51.100.${lastAccount}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ada', email: address, password: 'correct horse battery staple', locale: 'en' })
    })
    expect(response.status).toBe(200)
    return address
  }

  /** The one email job of the test: the table is emptied before each. */
  const emailJob = async () =>
    (
      await sql<{ state: string; attempts: number; payload: { url: string } | null; last_error: string | null }>`
        select state, attempts, payload, last_error from job where kind = 'identity.send-email'
      `.execute(db)
    ).rows

  it('answers before the email is sent, then delivers it on the retry after the provider fails once', async () => {
    email.failures = 1
    const address = await signUp()

    expect(email.sent.filter((sent) => sent.to === address)).toEqual([])

    await jobs.worker.drain()
    expect(await emailJob()).toMatchObject([
      { state: 'pending', attempts: 1, last_error: expect.stringContaining('503') }
    ])

    clock.advance(retryDelayMs(1))
    await jobs.worker.drain()

    expect(email.sent.filter((sent) => sent.to === address)).toHaveLength(1)
    expect(email.sent.at(-1)?.text).toContain(`${webOrigin}/api/auth/verify-email?token=`)
    expect(await emailJob()).toMatchObject([{ state: 'done', attempts: 2, payload: null }])
  })

  it('leaves an email whose provider keeps failing as a failed job, with neither the link in the log nor in the table', async () => {
    email.failures = 5
    const address = await signUp()
    await jobs.worker.drain()
    const link = (await emailJob())[0]?.payload?.url as string
    expect(link).toContain('token=')

    for (let attempt = 1; attempt < 5; attempt++) {
      clock.advance(retryDelayMs(attempt))
      await jobs.worker.drain()
    }

    expect(email.sent.filter((sent) => sent.to === address)).toEqual([])
    expect(await emailJob()).toMatchObject([{ state: 'failed', attempts: 5, payload: null }])
    expect(lines.at(-1)).toMatchObject({ level: 50, kind: 'identity.send-email', attempt: 5, msg: 'job failed' })
    expect(JSON.stringify(lines)).not.toContain(new URL(link).searchParams.get('token'))
  })
})
