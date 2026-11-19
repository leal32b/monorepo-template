import * as z from 'zod/mini'
import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'
import type { JobDefinition, JobRegistrar } from '#libs/ports/job-queue.port'
import { type Locale, localeSchema } from './locales'
import { type EmailText, writeEmail } from './write-email'

/** What a module's email job carries (ADR 0073): which message, to whom, in which language, its link and values. */
export type EmailOf<Name extends string> = {
  email: Name
  to: string
  locale: Locale
  url: string
  /** The `{name}` tokens' values, already formatted in the recipient's language and the organization's time zone. */
  values?: Record<string, string> | undefined
}

/** A module's emails: the job it enqueues, the writer, and the registration of the job's handler. */
export type Emails<Name extends string> = {
  job: JobDefinition<EmailOf<Name>>
  write(payload: EmailOf<Name>): EmailMessage
  register(registrar: JobRegistrar, emailSender: EmailSender): void
}

/**
 * Declares a module's emails (ADR 0073): its own job kind, written `<module>.send-email`, and its texts,
 * one object per language with the English one's shape. The job's schema accepts only the module's
 * message names and the languages; its handler writes the message when it runs and hands it to the port,
 * and a provider's refusal is retried by the queue (ADR 0056). A payload with a credential, such as a
 * link with a token, says `secretPayload` and is forgotten when its job ends (ADR 0057).
 */
export function defineEmails<Texts extends Record<string, EmailText>>(
  kind: string,
  texts: Record<Locale, Texts>,
  { secretPayload = false }: { secretPayload?: boolean } = {}
): Emails<keyof Texts & string> {
  type Name = keyof Texts & string
  const names = Object.keys(texts.en) as [Name, ...Name[]]
  const job: JobDefinition<EmailOf<Name>> = {
    kind,
    schema: z.object({
      email: z.enum(names),
      to: z.string(),
      locale: localeSchema,
      url: z.string(),
      values: z.optional(z.record(z.string(), z.string()))
    }) as z.ZodMiniType<EmailOf<Name>>,
    secretPayload
  }
  const write = ({ email, ...message }: EmailOf<Name>) => writeEmail(texts[message.locale][email] as EmailText, message)
  return {
    job,
    write,
    register: (registrar, emailSender) => registrar.register(job, async (payload) => emailSender.send(write(payload)))
  }
}
