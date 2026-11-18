import { plans } from '@repo/contracts'
import { BillingProviderUnavailableException } from '#libs/ports/billing-provider.port'
import { SubscriptionChangedException, SubscriptionNotActiveException } from '../../billing.errors'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { ChangePlanService } from './change-plan.service'

const owner = { kind: 'member', id: 'user-owner' } as const
const trialEndsAt = new Date('2026-10-20T12:00:00.000Z')

function setUp() {
  const kit = billingKit()
  const service = new ChangePlanService(kit.unitOfWork, kit.provider, kit.clock, kit.ids)
  const choose = (plan: 'basic' | 'pro', version: number) =>
    service.execute('org-1', { plan, version }, owner, trialEndsAt)
  return { ...kit, choose }
}

describe('ChangePlanService (ADR 0063)', () => {
  it("schedules a cheaper plan for the end of the period, at the provider's next charges", async () => {
    const kit = setUp()
    const row = await subscribed(kit, { plan: 'pro' })

    await kit.choose('basic', row.version)

    expect(await kit.subscriptions.find('org-1')).toMatchObject({ plan: 'pro', nextPlan: 'basic' })
    expect(await kit.provider.subscription(row.providerSubscriptionId as string)).toMatchObject({
      price: plans.basic.price
    })
    expect(await kit.entries()).toEqual([
      expect.objectContaining({ actor: owner, action: 'downgrade-scheduled', fields: ['nextPlan'] })
    ])
  })

  it('withdraws it when the current plan is chosen again, at the current price', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { plan: 'pro' })
    await kit.choose('basic', row.version)

    await kit.choose('pro', row.version + 1)

    expect(await kit.subscriptions.find('org-1')).toMatchObject({ plan: 'pro', nextPlan: null })
    expect(await kit.provider.subscription(row.providerSubscriptionId as string)).toMatchObject({
      price: plans.pro.price
    })
    expect((await kit.entries()).map((entry) => entry.action)).toEqual(['downgrade-withdrawn', 'downgrade-scheduled'])
  })

  it('changes nothing, and calls nobody, for the plan already in place', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { plan: 'pro' })
    const changePlan = vi.spyOn(kit.provider, 'changePlan')

    await kit.choose('pro', row.version)

    expect(changePlan).not.toHaveBeenCalled()
    expect(await kit.entries()).toEqual([])
  })

  it('refuses a stale version, and an organization on trial', async () => {
    const kit = setUp()

    await expect(kit.choose('basic', 4)).rejects.toThrow(SubscriptionChangedException)
    await expect(kit.choose('basic', 0)).rejects.toThrow(SubscriptionNotActiveException)
  })

  it('writes nothing when the provider is out of reach', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { plan: 'pro' })
    kit.provider.failNextCall()

    await expect(kit.choose('basic', row.version)).rejects.toThrow(BillingProviderUnavailableException)

    expect(await kit.subscriptions.find('org-1')).toMatchObject({ nextPlan: null, version: row.version })
  })

  it('refuses the write when the row moved while the provider was called', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { plan: 'pro' })
    vi.spyOn(kit.provider, 'changePlan').mockImplementationOnce(async () => {
      await kit.subscriptions.save(row)
    })

    await expect(kit.choose('basic', row.version)).rejects.toThrow(SubscriptionChangedException)
  })
})
