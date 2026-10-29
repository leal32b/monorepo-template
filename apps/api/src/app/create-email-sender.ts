import type { Logger } from 'pino'
import type { EmailTransport } from '#config/env'
import { LogEmailSender } from '#libs/adapters/log-email-sender'
import { ResendEmailSender } from '#libs/adapters/resend-email-sender'
import type { EmailSender } from '#libs/ports/email-sender.port'

/** The adapter the configuration picks (ADR 0021): Resend when it is configured, the log otherwise. */
export function createEmailSender(transport: EmailTransport, logger: Logger): EmailSender {
  return transport.kind === 'resend'
    ? new ResendEmailSender({ apiKey: transport.apiKey, from: transport.from })
    : new LogEmailSender(logger)
}
