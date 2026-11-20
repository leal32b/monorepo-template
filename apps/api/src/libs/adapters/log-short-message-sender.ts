import type { Logger } from 'pino'
import type { ShortMessage, ShortMessageSender } from '#libs/ports/short-message-sender.port'

/**
 * Development transport for short messages (ADR 0073): logs the number and the text, so a developer can
 * follow a flow without a provider. Never for production, where a code or a link must not reach the logs.
 */
export class LogShortMessageSender implements ShortMessageSender {
  constructor(private readonly logger: Logger) {}

  async send({ to, text }: ShortMessage): Promise<void> {
    this.logger.info({ to, text }, 'short message logged, not sent')
  }
}
