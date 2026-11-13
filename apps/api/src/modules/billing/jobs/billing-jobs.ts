import type { Logger } from 'pino'
import * as z from 'zod/mini'
import type { BillingNotice, BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { JobDefinition, JobRegistrar } from '#libs/ports/job-queue.port'
import type { BillingDirectory } from '../billing-directory.port'
import type { BillingUnitOfWork } from '../billing-unit-of-work.port'
import { type SyncSubscription, SyncSubscriptionService } from '../commands/sync-subscription/sync-subscription.service'

const providerId = z.optional(z.string())

/**
 * The work of one provider's notice (ADR 0063): its provider and the ids it named. Its retries and its
 * end as `failed` come from the queue (ADR 0056): about 43 minutes cover a short outage of the provider.
 */
export const syncSubscription: JobDefinition<SyncSubscription> = {
  kind: 'billing.sync-subscription',
  schema: z.object({
    provider: z.string(),
    eventId: z.string(),
    subscriptionId: providerId,
    checkoutId: providerId,
    customerId: providerId
  })
}

/** The job a notice taken in by the webhook inbox enqueues: its ids, and nothing else of it. */
export function syncPayloadOf(
  provider: string,
  { eventId, subscriptionId, checkoutId, customerId }: BillingNotice
): SyncSubscription {
  return { provider, eventId, subscriptionId, checkoutId, customerId }
}

export type BillingJobsDeps = {
  unitOfWork: BillingUnitOfWork
  directory: BillingDirectory
  provider: BillingProvider
  clock: Clock
  ids: IdGenerator
  logger: Logger
}

/** Billing's job kinds, registered by the composition root with the ports they need. */
export function registerBillingJobs(registrar: JobRegistrar, deps: BillingJobsDeps): void {
  const sync = new SyncSubscriptionService(deps)
  registrar.register(syncSubscription, (payload) => sync.execute(payload))
}
