/** One message, ready to send: the identity module writes it from a template (ADR 0021). */
export type EmailMessage = {
  to: string
  subject: string
  text: string
  html: string
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}
