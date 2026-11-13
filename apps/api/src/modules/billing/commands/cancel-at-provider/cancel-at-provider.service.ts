import type { Logger } from 'pino'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'

/** What the job is given: the deleted organization, and its subscription at the provider. */
export type CancelAtProvider = { provider: string; organizationId: string; subscriptionId: string }

/**
 * The end of a deleted organization's subscription at the provider (ADR 0063): at once, not at the end
 * of the period, and only once the organization is gone, so a deletion that failed after its hook
 * cancels nothing. While its row still exists the organization does, and the job tries again later; on
 * its last attempt it leaves the subscription as it is, with a warning. The template refunds nothing.
 */
export class CancelAtProviderService {
  constructor(private readonly deps: { unitOfWork: BillingUnitOfWork; provider: BillingProvider; logger: Logger }) {}

  async execute({ provider, organizationId, subscriptionId }: CancelAtProvider, lastAttempt: boolean): Promise<void> {
    const line = { provider, organizationId, subscriptionId }
    if (provider !== this.deps.provider.name) {
      this.deps.logger.warn({ ...line, reason: 'another provider' }, 'billing cancellation skipped')
      return
    }
    const row = await this.deps.unitOfWork.run(organizationId, ({ subscriptions }) =>
      subscriptions.find(organizationId)
    )
    if (row !== null) {
      if (!lastAttempt) throw new Error('the organization still exists: its deletion has not happened yet')
      this.deps.logger.warn({ ...line, reason: 'organization kept' }, 'billing cancellation skipped')
      return
    }
    await this.deps.provider.cancel(subscriptionId, { atPeriodEnd: false })
    this.deps.logger.info(line, 'billing subscription ended with its organization')
  }
}
