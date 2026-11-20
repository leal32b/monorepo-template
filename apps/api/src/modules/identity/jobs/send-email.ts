import type { EmailOf } from '#libs/notifications/define-emails'
import type { EmailSender } from '#libs/ports/email-sender.port'
import type { JobRegistrar } from '#libs/ports/job-queue.port'
import { identityEmails } from '../emails/identity-emails'

/**
 * How long every link with a token that identity emails works: confirmation, reset and deletion
 * (ADR 0057). The job's attempts end before it, so a link that arrives still works; a test keeps it so.
 */
export const EMAIL_LINK_SECONDS = 60 * 60

/** The identity email kinds, one per flow. */
export type IdentityEmail = Parameters<typeof identityEmails.write>[0]['email']

/** What an identity email is made from; the handler writes its text when it sends. */
export type SendEmail = EmailOf<IdentityEmail>

/**
 * One identity email (ADR 0057, ADR 0073). Its link is a credential, so the payload is forgotten when
 * the job ends; a provider's refusal is retried on the queue's schedule (ADR 0056).
 */
export const sendEmail = identityEmails.job

/** Identity's job kinds, registered by the composition root with the port they send through. */
export function registerIdentityJobs(registrar: JobRegistrar, { emailSender }: { emailSender: EmailSender }): void {
  identityEmails.register(registrar, emailSender)
}
