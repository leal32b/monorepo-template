/**
 * One short message, ready to send (ADR 0073): a number in E.164 (`+5511912345678`) and plain text.
 * Provider neutral, for SMS; a WhatsApp adapter will need a template's name and values instead of the
 * text outside the 24-hour window, and the port gains them then.
 */
export type ShortMessage = {
  to: string
  text: string
}

export interface ShortMessageSender {
  send(message: ShortMessage): Promise<void>
}
