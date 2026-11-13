import { BillingProviderUnavailableException } from '#libs/ports/billing-provider.port'
import { SubscriptionChangedException, SubscriptionNotActiveException } from '../../billing.errors'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { CancelSubscriptionService } from './cancel-subscription.service'

const owner = { kind: 'member', id: 'user-owner' } as const
const trialEndsAt = new Date('2026-10-20T12:00:00.000Z')

function setUp() {
  const kit = billingKit()
  const service = new CancelSubscriptionService(kit)
  return { ...kit, cancel: (version: number) => service.execute('org-1', { version }, owner, trialEndsAt) }
}

describe('CancelSubscriptionService (ADR 0063)', () => {
  it("ends the plan at the end of the paid period, as the provider then says, with the owner's entry", async () => {
    const kit = setUp()
    const row = await subscribed(kit)

    await kit.cancel(row.version)

    expect(await kit.provider.subscription(row.providerSubscriptionId as string)).toMatchObject({
      status: 'active',
      cancelAtPeriodEnd: true
    })
    expect(await kit.subscriptions.find('org-1')).toMatchObject({ status: 'active', cancelAtPeriodEnd: true })
    expect(await kit.entries()).toEqual([
      expect.objectContaining({ actor: owner, action: 'cancellation-scheduled', fields: ['cancelAtPeriodEnd'] })
    ])
  })

  it('changes nothing when the end is already scheduled', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { cancelAtPeriodEnd: true })
    const cancel = vi.spyOn(kit.provider, 'cancel')

    await kit.cancel(row.version)

    expect(cancel).not.toHaveBeenCalled()
  })

  it("writes nothing when the provider's state did not change", async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    vi.spyOn(kit.provider, 'cancel').mockResolvedValueOnce()

    await kit.cancel(row.version)

    expect(await kit.subscriptions.find('org-1')).toMatchObject({ version: row.version, cancelAtPeriodEnd: false })
    expect(await kit.entries()).toEqual([])
  })

  it('refuses a stale version, and an organization with no plan', async () => {
    const kit = setUp()

    await expect(kit.cancel(2)).rejects.toThrow(SubscriptionChangedException)
    await expect(kit.cancel(0)).rejects.toThrow(SubscriptionNotActiveException)
  })

  it('answers as an outage when the provider no longer knows the subscription', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { providerSubscriptionId: 'sub_gone' })
    vi.spyOn(kit.provider, 'cancel').mockResolvedValueOnce()

    await expect(kit.cancel(row.version)).rejects.toThrow(BillingProviderUnavailableException)
    expect(await kit.entries()).toEqual([])
  })
})
