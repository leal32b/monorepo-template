import { appendFile } from 'node:fs/promises'
import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'

/**
 * End-to-end transport (ADR 0045): appends each message as one JSON line to a file, so a browser test
 * can open the link it carries. Wired only by `main.e2e.ts`, never by the production entry.
 */
export class FileEmailSender implements EmailSender {
  constructor(private readonly file: string) {}

  async send(message: EmailMessage): Promise<void> {
    await appendFile(this.file, `${JSON.stringify(message)}\n`)
  }
}
