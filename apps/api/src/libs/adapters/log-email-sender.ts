import type { Logger } from 'pino'
import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'

/**
 * Development transport (ADR 0021): logs the recipient, the subject and the text, links included,
 * so a developer can follow the flows without a provider. Never for production, where links must
 * not reach the logs.
 */
export class LogEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async send({ to, subject, text }: EmailMessage): Promise<void> {
    this.logger.info({ to, subject, text }, 'email logged, not sent')
  }
}
