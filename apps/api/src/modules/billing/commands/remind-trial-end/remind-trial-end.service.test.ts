import { onTrial } from '../../subscription'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { RemindTrialEndService } from './remind-trial-end.service'

const trialEndsAt = '2026-11-22T12:00:00.000Z'

function setUp(now?: Date) {
  const kit = billingKit(now)
  return { ...kit, service: new RemindTrialEndService(kit) }
}

describe('RemindTrialEndService (ADR 0073)', () => {
  it('emails the owner of an organization still on trial, through the queue', async () => {
    const kit = setUp()

    await kit.service.execute({ organizationId: 'org-1', trialEndsAt })

    expect(kit.jobs.all).toMatchObject([
      {
        kind: 'billing.send-email',
        payload: {
          email: 'trialEnding',
          to: 'ada@example.com',
          locale: 'es',
          values: { organization: 'Acme Barbers', days: '3', trialEnds: '22 de noviembre de 2026' }
        }
      }
    ])
  })

  it('still reminds an organization whose checkout is open but not paid', async () => {
    const kit = setUp()
    await kit.subscriptions.save({
      ...onTrial('org-1', new Date(trialEndsAt), kit.clock.now()),
      checkout: { kind: 'subscription', plan: 'pro', amount: { amount: 4900, currency: 'BRL' } }
    })

    await kit.service.execute({ organizationId: 'org-1', trialEndsAt })

    expect(kit.jobs.all).toHaveLength(1)
  })

  it('sends nothing once a plan was paid for, once the trial ended, or with no owner', async () => {
    const paid = setUp()
    await subscribed(paid)
    const late = setUp(new Date('2026-11-22T12:00:00.000Z'))
    const ownerless = setUp()

    await paid.service.execute({ organizationId: 'org-1', trialEndsAt })
    await late.service.execute({ organizationId: 'org-1', trialEndsAt })
    await ownerless.service.execute({ organizationId: 'org-gone', trialEndsAt })

    expect(paid.jobs.all.map((job) => job.kind)).not.toContain('billing.send-email')
    expect(late.jobs.all).toEqual([])
    expect(ownerless.jobs.all).toEqual([])
  })
})
