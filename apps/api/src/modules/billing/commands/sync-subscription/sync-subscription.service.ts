import type { Logger } from 'pino'
import type { BillingNotice, BillingProvider, ProviderSubscription } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { SubscriptionChangedException } from '../../billing.errors'
import { subscriptionEntry } from '../../billing-audit'
import type { BillingDirectory } from '../../billing-directory.port'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import {
  activate,
  applyProviderState,
  changedFields,
  changePlanNow,
  clearCheckout,
  type Subscription,
  syncAction
} from '../../subscription'

/** What the job is given: the provider and the ids its notice named, never the notice's content (ADR 0063). */
export type SyncSubscription = BillingNotice & { provider: string }

type Done = Parameters<typeof syncAction>[2]

/** A subscription the provider still charges. */
const live = (state: ProviderSubscription) => state.status !== 'cancelled'

/**
 * The job a provider's notice enqueues (ADR 0063). It never applies the notice: it finds the
 * organization by our own row, reads the provider's current state with our key, and writes it through
 * the rules, saving with the version read and recording what changed, by the system. So order does not
 * matter, a repeat or a replay can at most make it read again, and the next notice heals a lost one.
 *
 * - A first checkout completes once the provider's new subscription is active: the row adopts it with
 *   the plan the checkout was for, and a subscription it replaces is ended at the provider.
 * - An upgrade completes once its payment is paid: the provider's price changes for the next charges,
 *   then the plan. A payment that expired, or still open when the paid period ended, is withdrawn and
 *   dropped.
 * - A live subscription of ours that the row does not hold, and no checkout opened, is a duplicate: it is
 *   ended at once and logged at error, for the operator to refund.
 * - A notice about a customer no row holds is ignored; a provider state whose reference names another
 *   organization is refused, logged at error (T50).
 */
export class SyncSubscriptionService {
  constructor(
    private readonly deps: {
      unitOfWork: BillingUnitOfWork
      directory: BillingDirectory
      provider: BillingProvider
      clock: Clock
      ids: IdGenerator
      logger: Logger
    }
  ) {}

  async execute(notice: SyncSubscription): Promise<void> {
    const { unitOfWork, directory, provider, logger } = this.deps
    const line = { provider: notice.provider, eventId: notice.eventId }
    if (notice.provider !== provider.name) {
      logger.warn({ ...line, reason: 'another provider' }, 'billing event ignored')
      return
    }
    const organizations = await directory.organizationsFor(notice.provider, notice)
    if (organizations.length !== 1) {
      if (organizations.length === 0) logger.info({ ...line, reason: 'unknown customer' }, 'billing event ignored')
      else logger.error({ ...line, organizations }, 'billing event names two organizations')
      return
    }
    const organizationId = organizations[0] as string
    const read = await unitOfWork.run(organizationId, ({ subscriptions }) => subscriptions.find(organizationId))
    if (read === null) {
      logger.info({ ...line, reason: 'organization gone' }, 'billing event ignored')
      return
    }
    const outcome = await this.#decide(read, notice, { ...line, organizationId })
    if (outcome === null) return
    await this.#write(read, outcome.next, outcome.done)
  }

  /** What the provider's state makes of the row, after the provider calls it needs; null to stop. */
  async #decide(
    read: Subscription,
    notice: SyncSubscription,
    line: Record<string, string>
  ): Promise<{ next: Subscription; done: Done } | null> {
    const { provider, clock, logger } = this.deps
    const now = clock.now()
    const ours = (state: ProviderSubscription | null) => {
      if (state === null || state.reference === read.organizationId) return true
      logger.error({ ...line, subscriptionId: state.subscriptionId }, 'billing reference names another organization')
      return false
    }
    const held = read.providerSubscriptionId
    const named = notice.subscriptionId !== undefined && notice.subscriptionId !== held ? notice.subscriptionId : null
    const heldState = held === null ? null : await provider.subscription(held)
    const namedState = named === null ? null : await provider.subscription(named)
    if (!ours(heldState) || !ours(namedState)) return null
    const payment = read.checkoutPage === null ? null : await provider.payment(read.checkoutPage.id)

    // A first checkout: the new subscription, once its first charge is paid.
    if (read.checkout?.kind === 'subscription' && namedState?.status === 'active') {
      if (heldState !== null && live(heldState)) await provider.cancel(heldState.subscriptionId, { atPeriodEnd: false })
      return { next: activate(read, namedState, now), done: 'activated' }
    }
    if (
      namedState !== null &&
      live(namedState) &&
      namedState.status !== 'pending' &&
      read.checkout?.kind !== 'subscription'
    ) {
      await provider.cancel(namedState.subscriptionId, { atPeriodEnd: false })
      logger.error({ ...line, subscriptionId: namedState.subscriptionId }, 'billing duplicate subscription')
    }

    let next = read
    let done: Done
    const page = read.checkoutPage
    if (read.checkout !== null && page !== null) {
      const periodOver = read.paidThrough !== null && now >= read.paidThrough
      if (payment === 'paid' && read.checkout.kind === 'upgrade') {
        await provider.changePlan(held as string, read.checkout.plan)
        next = clearCheckout(changePlanNow(read, read.checkout.plan, now), now)
        done = 'plan-changed'
      } else if (payment === 'expired' || (payment === 'open' && read.checkout.kind === 'upgrade' && periodOver)) {
        await provider.cancelCheckout(page.id)
        next = clearCheckout(read, now)
        done = read.checkout.kind === 'upgrade' ? 'upgrade-abandoned' : 'checkout-abandoned'
      }
    }
    if (heldState !== null) next = applyProviderState(next, heldState, now)
    return { next, done }
  }

  /** Saves the row at the version read, with the system's audit entry; a save that lost to another throws, and the retry reads again. */
  async #write(read: Subscription, next: Subscription, done: Done): Promise<void> {
    const { unitOfWork, ids, clock, logger } = this.deps
    const action = syncAction(read, next, done)
    if (action === null) return
    const { organizationId } = read
    await unitOfWork.run(organizationId, async ({ subscriptions, audit }) => {
      const current = await subscriptions.find(organizationId)
      if (current?.version !== read.version) throw new SubscriptionChangedException()
      await audit.record(
        subscriptionEntry(organizationId, {
          id: ids.generate(),
          at: clock.now(),
          actor: { kind: 'system' },
          action,
          fields: changedFields(read, next)
        })
      )
      await subscriptions.save(next)
    })
    logger.info({ organizationId, action }, 'billing synced')
  }
}
