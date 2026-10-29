import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'

/** Test double (ADR 0021): keeps every message, so a test can follow the link that was sent. */
export class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = []

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message)
  }
}
