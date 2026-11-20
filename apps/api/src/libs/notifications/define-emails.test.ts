import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { JobRegistry } from '#libs/jobs/job-registry'
import { JobWorker } from '#libs/jobs/job-worker'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { defineEmails, type EmailOf } from './define-emails'
import { locales } from './locales'
import { writeEmail } from './write-email'

const en = {
  hello: { subject: 'Hello {name}', body: 'Hi {name}.', action: 'Open', footer: 'Bye.' },
  later: { subject: 'Later', body: 'See you.', action: 'Open', footer: 'Bye.' }
}
const es: typeof en = {
  hello: { subject: 'Hola {name}', body: 'Hola {name}.', action: 'Abrir', footer: 'Adiós.' },
  later: { subject: 'Luego', body: 'Hasta luego.', action: 'Abrir', footer: 'Adiós.' }
}
const ptBR: typeof en = {
  hello: { subject: 'Olá {name}', body: 'Oi {name}.', action: 'Abrir', footer: 'Tchau.' },
  later: { subject: 'Depois', body: 'Até logo.', action: 'Abrir', footer: 'Tchau.' }
}
const hello: EmailOf<'hello' | 'later'> = {
  email: 'hello',
  to: 'ada@example.com',
  locale: 'es',
  url: 'https://app.example.com/',
  values: { name: 'Ada' }
}

function setup(emails: ReturnType<typeof defineEmails<typeof en>>) {
  const clock = new FixedClock(new Date('2026-11-19T09:00:00.000Z'))
  const jobs = new InMemoryJobs(new CountingIds(), clock)
  const registry = new JobRegistry()
  const sender = new RecordingEmailSender()
  emails.register(registry, sender)
  const { logger } = memoryLogger()
  const worker = new JobWorker({ store: jobs, registry, clock, timer: new ManualTimer(clock), logger, idlePollMs: 1 })
  return { jobs, worker, sender }
}

describe('defineEmails (ADR 0073)', () => {
  const emails = defineEmails('test.send-email', { en, es, 'pt-BR': ptBR })

  it('writes a message in the recipient’s language with its values', () => {
    expect(emails.write(hello)).toEqual(writeEmail(es.hello, hello))
    expect(emails.write(hello).subject).toBe('Hola Ada')
  })

  it('sends a message enqueued on its own job kind, and keeps the payload of a kind that is not secret', async () => {
    const { jobs, worker, sender } = setup(emails)

    await jobs.enqueue(emails.job, hello)
    await worker.drain()

    expect(sender.sent).toEqual([emails.write(hello)])
    expect(jobs.all).toMatchObject([{ kind: 'test.send-email', state: 'done', payload: hello }])
  })

  it('forgets the payload of a secret kind when its job ends', async () => {
    const secret = defineEmails('test.send-secret', { en, es, 'pt-BR': ptBR }, { secretPayload: true })
    const { jobs, worker } = setup(secret)

    await jobs.enqueue(secret.job, hello)
    await worker.drain()

    expect(jobs.all).toMatchObject([{ kind: 'test.send-secret', state: 'done', payload: null }])
  })

  it('refuses at the enqueue a message the module did not declare, or a language with no texts', async () => {
    const { jobs } = setup(emails)

    await expect(jobs.enqueue(emails.job, { ...hello, email: 'newsletter' as 'hello' })).rejects.toThrow(
      'test.send-email'
    )
    await expect(jobs.enqueue(emails.job, { ...hello, locale: 'fr' as 'en' })).rejects.toThrow('test.send-email')
  })

  it('writes in every language there are texts for', () => {
    expect(locales).toEqual(['en', 'es', 'pt-BR'])
  })
})
