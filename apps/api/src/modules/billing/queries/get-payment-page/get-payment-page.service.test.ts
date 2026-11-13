import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { GetPaymentPageService } from './get-payment-page.service'

const trialEndsAt = new Date('2026-11-25T12:00:00.000Z')

describe('GetPaymentPageService (ADR 0063)', () => {
  it("answers the provider's page for what is overdue", async () => {
    const kit = billingKit()
    const row = await subscribed(kit, { status: 'past_due' })
    vi.spyOn(kit.provider, 'paymentPage').mockResolvedValueOnce('https://pay.example/invoice/1')

    const page = await new GetPaymentPageService(kit.unitOfWork, kit.provider, kit.clock).execute('org-1', trialEndsAt)

    expect(page).toEqual({ url: 'https://pay.example/invoice/1' })
    expect(kit.provider.paymentPage).toHaveBeenCalledWith(row.providerSubscriptionId)
  })

  it('answers none when the provider has no page, or the organization no subscription there', async () => {
    const kit = billingKit()
    const service = new GetPaymentPageService(kit.unitOfWork, kit.provider, kit.clock)

    expect(await service.execute('org-1', trialEndsAt)).toEqual({ url: null })
    await subscribed(kit, {}, 'org-2')
    expect(await service.execute('org-2', trialEndsAt)).toEqual({ url: null })
  })
})
