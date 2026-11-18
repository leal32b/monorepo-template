import { billingSchema, plans } from '@repo/contracts'
import { StartCheckoutService } from '../../commands/start-checkout/start-checkout.service'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { GetBillingService } from './get-billing.service'

const trialEndsAt = new Date('2026-11-25T12:00:00.000Z')

describe('GetBillingService (ADR 0063)', () => {
  it("reads an organization with no row as its trial, at version 0, with the provider's minimum", async () => {
    const kit = billingKit()

    const billing = billingSchema.parse(
      await new GetBillingService(kit.unitOfWork, kit.provider, kit.clock).execute('org-1', trialEndsAt)
    )

    expect(billing).toEqual({
      subscription: {
        status: 'trialing',
        access: 'full',
        plan: null,
        nextPlan: null,
        trialEndsAt: '2026-11-25T12:00:00.000Z',
        periodStartsAt: null,
        paidThrough: null,
        pastDueSince: null,
        cancelAtPeriodEnd: false,
        checkout: null
      },
      version: 0,
      reference: null,
      checkoutUrl: null,
      checkoutExpiresAt: null,
      minimumCharge: { amount: 500, currency: 'BRL' }
    })
  })

  it("shows the provider's reference, and the open checkout's page while it takes a payment", async () => {
    const kit = billingKit()
    const row = await subscribed(kit)
    const start = new StartCheckoutService(kit.unitOfWork, kit.provider, kit.clock, kit.ids, 'http://localhost:5173')
    const { url } = await start.execute(
      'org-1',
      { plan: 'pro', method: 'card', version: row.version, returnTo: '/acme/settings/billing' },
      { kind: 'member', id: 'user-owner' },
      trialEndsAt
    )
    const read = new GetBillingService(kit.unitOfWork, kit.provider, kit.clock)

    const open = billingSchema.parse(await read.execute('org-1', trialEndsAt))
    kit.clock.advance(30 * 60 * 1000)
    const lapsed = await read.execute('org-1', trialEndsAt)

    expect(open).toMatchObject({
      subscription: {
        status: 'active',
        plan: 'basic',
        paidThrough: '2026-12-01T12:00:00.000Z',
        checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: plans.pro.price.currency } }
      },
      version: row.version + 2,
      reference: row.providerSubscriptionId,
      checkoutUrl: url,
      checkoutExpiresAt: '2026-11-19T12:30:00.000Z'
    })
    expect(lapsed).toMatchObject({ checkoutUrl: null, checkoutExpiresAt: null })
  })
})
