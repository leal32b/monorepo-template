import * as z from 'zod/mini'
import type { EmailMessage, EmailSender } from '#libs/ports/email-sender.port'

const RESEND_EMAILS_URL = 'https://api.resend.com/emails'

/** Resend names each failure, e.g. `validation_error`; a body without a name is read as unknown. */
const resendErrorSchema = z.object({ name: z.string() })

export type ResendEmailSenderOptions = {
  /** Resend API key (`re_...`): a secret, never logged. */
  apiKey: string
  /** Sender, e.g. `Acme <noreply@acme.com>`, on a domain verified with Resend (ADR 0021). */
  from: string
  /** How long to wait for Resend before giving up; 10 s by default. */
  timeoutMs?: number
}

/**
 * Sends through Resend's HTTP API with one `fetch`, without its SDK (ADR 0021): a product on
 * another provider replaces only this file. A refusal throws with Resend's status and error name,
 * never the key or the recipient.
 */
export class ResendEmailSender implements EmailSender {
  constructor(private readonly options: ResendEmailSenderOptions) {}

  async send({ to, subject, text, html }: EmailMessage): Promise<void> {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.options.from, to, subject, text, html }),
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 10_000)
    })
    if (response.ok) {
      await response.text() // reading the body frees the connection
      return
    }
    const error = resendErrorSchema.safeParse(await response.json().catch(() => undefined))
    throw new Error(`Resend refused the email: ${response.status} ${error.success ? error.data.name : 'unknown'}`)
  }
}
