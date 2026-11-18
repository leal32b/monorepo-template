import { SubscriptionChangedException, SubscriptionNotActiveException } from '../../billing.errors'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { ResumeSubscriptionService } from './resume-subscription.service'

const owner = { kind: 'member', id: 'user-owner' } as const
const trialEndsAt = new Date('2026-10-20T12:00:00.000Z')

function setUp() {
  const kit = billingKit()
  const service = new ResumeSubscriptionService(kit)
  return { ...kit, resume: (version: number) => service.execute('org-1', { version }, owner, trialEndsAt) }
}

describe('ResumeSubscriptionService (ADR 0063)', () => {
  it('withdraws a scheduled end, as the provider then says', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { cancelAtPeriodEnd: true })
    await kit.provider.cancel(row.providerSubscriptionId as string, { atPeriodEnd: true })

    await kit.resume(row.version)

    expect(await kit.subscriptions.find('org-1')).toMatchObject({ cancelAtPeriodEnd: false })
    expect(await kit.entries()).toEqual([
      expect.objectContaining({ actor: owner, action: 'cancellation-withdrawn', fields: ['cancelAtPeriodEnd'] })
    ])
  })

  it('changes nothing when no end is scheduled', async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    const resume = vi.spyOn(kit.provider, 'resume')

    await kit.resume(row.version)

    expect(resume).not.toHaveBeenCalled()
  })

  it('refuses a stale version, and a plan that already ended', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { status: 'cancelled' })

    await expect(kit.resume(row.version + 1)).rejects.toThrow(SubscriptionChangedException)
    await expect(kit.resume(row.version)).rejects.toThrow(SubscriptionNotActiveException)
  })
})
