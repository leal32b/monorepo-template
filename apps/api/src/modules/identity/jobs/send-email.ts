import * as z from 'zod/mini'
import type { EmailSender } from '#libs/ports/email-sender.port'
import type { JobDefinition, JobRegistrar } from '#libs/ports/job-queue.port'
import { type EmailKind, emailTexts, type Locale } from '../emails/email-texts'
import { writeEmail } from '../emails/write-email'

/**
 * How long every link with a token that identity emails works: confirmation, reset and deletion
 * (ADR 0057). The job's attempts end before it, so a link that arrives still works; a test keeps it so.
 */
export const EMAIL_LINK_SECONDS = 60 * 60

/** What an identity email is made from; the handler writes its text when it sends. */
export type SendEmail = {
  email: EmailKind
  to: string
  locale: Locale
  url: string
  values?: Record<string, string> | undefined
}

/**
 * One identity email (ADR 0057). Its link is a credential, so the payload is forgotten when the job
 * ends; a provider's refusal is retried on the queue's schedule (ADR 0056).
 */
export const sendEmail: JobDefinition<SendEmail> = {
  kind: 'identity.send-email',
  schema: z.object({
    email: z.enum(Object.keys(emailTexts.en) as [EmailKind, ...EmailKind[]]),
    to: z.string(),
    locale: z.enum(Object.keys(emailTexts) as [Locale, ...Locale[]]),
    url: z.string(),
    values: z.optional(z.record(z.string(), z.string()))
  }),
  secretPayload: true
}

/** Identity's job kinds, registered by the composition root with the port they send through. */
export function registerIdentityJobs(registrar: JobRegistrar, { emailSender }: { emailSender: EmailSender }): void {
  registrar.register(sendEmail, async ({ email, ...message }) => emailSender.send(writeEmail(email, message)))
}
