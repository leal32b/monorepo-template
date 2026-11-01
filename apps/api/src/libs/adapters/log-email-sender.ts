import type { Logger } from 'pino'
import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'

/**
 * Development transport (ADR 0021): logs the recipient, the subject and the text, links included,
 * so a developer can follow the flows without a provider. Never for production, where links must
 * not reach the logs. The text is logged line by line: as one string its line breaks print as `\n`,
 * which a terminal takes for part of the link, and the link would not open.
 */
export class LogEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async send({ to, subject, text }: EmailMessage): Promise<void> {
    this.logger.info({ to, subject, text: text.split('\n').filter(Boolean) }, 'email logged, not sent')
  }
}
