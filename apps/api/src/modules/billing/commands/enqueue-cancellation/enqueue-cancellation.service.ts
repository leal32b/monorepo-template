import type { Clock } from '#libs/ports/clock.port'
import type { JobDefinition, JobQueue } from '#libs/ports/job-queue.port'
import type { OrganizationDeletionListener } from '#modules/identity/index'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import type { CancelAtProvider } from '../cancel-at-provider/cancel-at-provider.service'

/** How long after the deletion's hook the job first looks: the deletion is done by then. */
export const CANCEL_DELAY_MS = 60_000

/**
 * Deleting an organization stops its charges (ADR 0063): right before it goes, with its owner or with the
 * account of its only member, the end of its subscription at the provider is enqueued, when it has one
 * that has not ended. The job runs once the organization is gone; its row goes with it (`on delete
 * cascade`), so it is read here.
 */
export class EnqueueCancellationService implements OrganizationDeletionListener {
  constructor(
    private readonly unitOfWork: BillingUnitOfWork,
    private readonly jobs: JobQueue,
    private readonly clock: Clock,
    private readonly job: JobDefinition<CancelAtProvider>
  ) {}

  async beforeDelete(organizationIds: readonly string[]): Promise<void> {
    for (const organizationId of organizationIds) {
      const row = await this.unitOfWork.run(organizationId, ({ subscriptions }) => subscriptions.find(organizationId))
      if (row?.providerSubscriptionId == null || row.status === 'cancelled') continue
      await this.jobs.enqueue(
        this.job,
        { provider: row.provider as string, organizationId, subscriptionId: row.providerSubscriptionId },
        { runAt: new Date(this.clock.now().getTime() + CANCEL_DELAY_MS) }
      )
    }
  }
}
