import type { ShortMessage, ShortMessageSender } from '#libs/ports/short-message-sender.port'

/** Test double (ADR 0073): keeps every short message, so a test can read what was sent. */
export class RecordingShortMessageSender implements ShortMessageSender {
  readonly sent: ShortMessage[] = []

  async send(message: ShortMessage): Promise<void> {
    this.sent.push(message)
  }
}
