import { type Kysely, sql } from 'kysely'
import type { Clock } from '#libs/ports/clock.port'
import type { JobDefinition, JobQueue } from '#libs/ports/job-queue.port'
import type { WebhookInbox } from '#libs/ports/webhook-inbox.port'
import type { WebhookNotice } from '#libs/ports/webhook-reader.port'
import { KyselyPlatformUnitOfWork } from './kysely-platform-unit-of-work'

type InboxDatabase = { webhook_event: { source: string; event_id: string; received_at: Date } }

export type WebhookInboxDeps<Notice extends WebhookNotice, Payload> = {
  db: Kysely<unknown>
  clock: Clock
  /** The queue on a transaction, as the composition root builds it, so the job goes in with the event. */
  jobsOn: (transaction: Kysely<unknown>) => JobQueue
  /** The job each new notice enqueues, and its payload: the provider's ids, never the notice's content. */
  job: JobDefinition<Payload>
  payloadOf: (source: string, notice: Notice) => Payload
}

/**
 * The inbox of `/api/webhooks/<provider>` (ADR 0063), in Postgres: the event id goes into
 * `webhook_event` with `on conflict do nothing`, and when the row is new the job is enqueued in the same
 * platform transaction. Neither table belongs to a tenant, so no organization is named.
 */
export class KyselyWebhookInbox<Notice extends WebhookNotice, Payload> implements WebhookInbox<Notice> {
  readonly #unitOfWork: KyselyPlatformUnitOfWork<{ events: Kysely<InboxDatabase>; jobs: JobQueue }>
  readonly #deps: WebhookInboxDeps<Notice, Payload>

  constructor(deps: WebhookInboxDeps<Notice, Payload>) {
    this.#deps = deps
    this.#unitOfWork = new KyselyPlatformUnitOfWork(deps.db, (transaction) => ({
      events: transaction.withTables<InboxDatabase>(),
      jobs: deps.jobsOn(transaction)
    }))
  }

  receive(source: string, notice: Notice): Promise<boolean> {
    return this.#unitOfWork.runAsPlatform(async ({ events, jobs }) => {
      const recorded = await events
        .insertInto('webhook_event')
        .values({ source, event_id: notice.eventId, received_at: this.#deps.clock.now() })
        .onConflict((conflict) => conflict.columns(['source', 'event_id']).doNothing())
        .returning('event_id')
        .executeTakeFirst()
      if (recorded === undefined) return false
      await jobs.enqueue(this.#deps.job, this.#deps.payloadOf(source, notice))
      return true
    })
  }
}

/** How long a delivered event's id is kept (ADR 0063): longer than either provider resends a notice. */
export const webhookEventRetention = { days: 30 }

/** Deletes the event ids past their keep, as of `now`, and returns how many went: webhooks' line in the purge (ADR 0050). */
export async function purgeWebhookEvents(db: Kysely<unknown>, now: Date): Promise<number> {
  const before = new Date(now.getTime() - webhookEventRetention.days * 24 * 60 * 60 * 1000)
  const { numAffectedRows } = await sql`delete from webhook_event where received_at < ${before}`.execute(db)
  return Number(numAffectedRows)
}
