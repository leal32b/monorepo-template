import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { CancelAtProviderService } from './cancel-at-provider.service'

/** The organization's work once the organization is gone: its row went with it. */
const gone = (unitOfWork: BillingUnitOfWork): BillingUnitOfWork => ({
  run: (organizationId, work) =>
    unitOfWork.run(organizationId, (repositories) =>
      work({ ...repositories, subscriptions: { ...repositories.subscriptions, find: async () => null } })
    )
})

describe('CancelAtProviderService (ADR 0063)', () => {
  it('ends the subscription at the provider at once, once the organization is gone', async () => {
    const kit = billingKit()
    const { logger, lines } = memoryLogger()
    const row = await subscribed(kit)
    const service = new CancelAtProviderService({ unitOfWork: gone(kit.unitOfWork), provider: kit.provider, logger })

    await service.execute(
      { provider: 'fake', organizationId: 'org-1', subscriptionId: row.providerSubscriptionId as string },
      false
    )

    expect(await kit.provider.subscription(row.providerSubscriptionId as string)).toMatchObject({ status: 'cancelled' })
    expect(lines).toContainEqual(expect.objectContaining({ msg: 'billing subscription ended with its organization' }))
  })

  it('tries again later while the organization still exists, and leaves it on the last attempt', async () => {
    const kit = billingKit()
    const { logger, lines } = memoryLogger()
    const row = await subscribed(kit)
    const service = new CancelAtProviderService({ unitOfWork: kit.unitOfWork, provider: kit.provider, logger })
    const job = { provider: 'fake', organizationId: 'org-1', subscriptionId: row.providerSubscriptionId as string }

    await expect(service.execute(job, false)).rejects.toThrow('still exists')
    await service.execute(job, true)

    expect(await kit.provider.subscription(row.providerSubscriptionId as string)).toMatchObject({ status: 'active' })
    expect(lines).toContainEqual(
      expect.objectContaining({ msg: 'billing cancellation skipped', reason: 'organization kept' })
    )
  })

  it('leaves a subscription of another provider alone', async () => {
    const kit = billingKit()
    const { logger, lines } = memoryLogger()
    const cancel = vi.spyOn(kit.provider, 'cancel')
    const service = new CancelAtProviderService({ unitOfWork: gone(kit.unitOfWork), provider: kit.provider, logger })

    await service.execute({ provider: 'asaas', organizationId: 'org-1', subscriptionId: 'sub_1' }, false)

    expect(cancel).not.toHaveBeenCalled()
    expect(lines).toContainEqual(expect.objectContaining({ reason: 'another provider' }))
  })
})
