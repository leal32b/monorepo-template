import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { jobLimits, retryDelayMs } from '#libs/jobs/job-limits'
import { JobRegistry } from '#libs/jobs/job-registry'
import { JobWorker } from '#libs/jobs/job-worker'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'
import { writeEmail } from '../emails/write-email'
import { EMAIL_LINK_SECONDS, registerIdentityJobs, type SendEmail, sendEmail } from './send-email'

const url = 'https://app.example.com/api/auth/reset-password/secret-token?callbackURL=%2Freset'
const reset: SendEmail = { email: 'resetPassword', to: 'ada@example.com', locale: 'pt-BR', url }

function setup(emailSender: EmailSender = new RecordingEmailSender()) {
  const clock = new FixedClock(new Date('2026-11-11T09:00:00.000Z'))
  const jobs = new InMemoryJobs(new CountingIds(), clock)
  const registry = new JobRegistry()
  const { logger, lines } = memoryLogger()
  registerIdentityJobs(registry, { emailSender })
  const worker = new JobWorker({ store: jobs, registry, clock, timer: new ManualTimer(clock), logger, idlePollMs: 1 })
  return { jobs, worker, lines }
}

describe('identity.send-email (ADR 0057)', () => {
  it('writes the email in the recipient’s language when it runs, sends it, and forgets the link', async () => {
    const sender = new RecordingEmailSender()
    const { jobs, worker } = setup(sender)
    const invitation: SendEmail = {
      email: 'invitation',
      to: 'bea@example.com',
      locale: 'en',
      url: 'https://app.example.com/invitations/abc',
      values: { organization: 'Acme', inviter: 'Ada (ada@example.com)' }
    }

    await jobs.enqueue(sendEmail, reset)
    await jobs.enqueue(sendEmail, invitation)
    await worker.drain()

    expect(sender.sent).toEqual([writeEmail('resetPassword', reset), writeEmail('invitation', invitation)])
    expect(jobs.all).toMatchObject([
      { kind: 'identity.send-email', state: 'done', payload: null },
      { kind: 'identity.send-email', state: 'done', payload: null }
    ])
  })

  it('asks for a retry when the provider refuses, without the link in the log', async () => {
    const refusing: EmailSender = {
      send: async (_message: EmailMessage) => {
        throw new Error('Resend refused the email: 503 internal_server_error')
      }
    }
    const { jobs, worker, lines } = setup(refusing)

    await jobs.enqueue(sendEmail, reset)
    await worker.drain()

    expect(jobs.all).toMatchObject([{ state: 'pending', attempts: 1, payload: reset }])
    expect(lines).toMatchObject([{ kind: 'identity.send-email', msg: 'job attempt failed' }])
    expect(JSON.stringify(lines)).not.toContain('secret-token')
  })

  it('refuses an email kind or a language it cannot write, at the enqueue', async () => {
    const { jobs } = setup()

    await expect(jobs.enqueue(sendEmail, { ...reset, email: 'newsletter' as 'resetPassword' })).rejects.toThrow(
      'identity.send-email'
    )
    await expect(jobs.enqueue(sendEmail, { ...reset, locale: 'fr' as 'en' })).rejects.toThrow('identity.send-email')
  })

  it('ends its last attempt while the link it carries still works', () => {
    const attempts = sendEmail.maxAttempts ?? jobLimits.maxAttempts
    let lastAttemptEndsMs = attempts * jobLimits.handlerTimeoutMs
    for (let failed = 1; failed < attempts; failed++) lastAttemptEndsMs += retryDelayMs(failed)

    expect(lastAttemptEndsMs).toBeLessThan(EMAIL_LINK_SECONDS * 1000)
  })
})
