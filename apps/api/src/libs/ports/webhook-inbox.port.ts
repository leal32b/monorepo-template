import type { WebhookNotice } from './webhook-reader.port'

/**
 * Where an authenticated notice is taken in (ADR 0063): its event id is recorded once per provider and
 * its work enqueued, in one transaction, so a repeat enqueues nothing and a recorded event always has
 * its job.
 */
export interface WebhookInbox<Notice extends WebhookNotice> {
  /** Takes `notice` in from `source`: true when it is new, false for an event already received. */
  receive(source: string, notice: Notice): Promise<boolean>
}
