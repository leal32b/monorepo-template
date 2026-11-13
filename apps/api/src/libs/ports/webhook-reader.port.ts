import type { IncomingHttpHeaders } from 'node:http'

/**
 * A notice failed the provider's authentication: a token or a signature that does not match, or none
 * (ADR 0063). `reason` says which, for the log; it never holds the body or a secret.
 */
export class WebhookRefused extends Error {
  constructor(readonly reason: string) {
    super(`webhook refused: ${reason}`)
    this.name = 'WebhookRefused'
  }
}

/** What every notice names: the provider's own id of the event, the key that keeps a repeat from running twice. */
export type WebhookNotice = { eventId: string }

/**
 * Whatever reads a provider's notices (ADR 0063): it authenticates the raw body before it parses
 * anything, then says what the notice is about.
 */
export interface WebhookReader<Notice extends WebhookNotice> {
  /** The provider's name: the last segment of `/api/webhooks/<name>`, and the source its events are kept under. */
  readonly name: string
  /**
   * Authenticates `rawBody` as sent, in the provider's way, and returns what it names, or `ignored` for
   * a kind of notice the template does not use. Throws `WebhookRefused` when authentication fails.
   */
  readWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): Promise<Notice | 'ignored'>
}
