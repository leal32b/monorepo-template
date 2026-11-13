import { FixedClock } from '#libs/adapters/fixed-clock'
import { ManualTimer } from '#libs/adapters/manual-timer'
import type { BillingNotice } from '#libs/ports/billing-provider.port'
import { createBillingProvider } from './create-billing-provider'

const clock = new FixedClock(new Date('2026-11-04T12:00:00.000Z'))
let sequence = 0
const ids = { generate: () => `id${++sequence}` }
const back = { returnUrl: 'http://localhost:5173/acme/settings/billing?checkout=returned', cancelUrl: 'http://x/c' }

describe('createBillingProvider (ADR 0063)', () => {
  it('bills through the fake when no provider is configured, taking commands that carry its token', async () => {
    const provider = createBillingProvider({ kind: 'fake', token: 'fake-billing-token-1' }, { clock, ids })
    await provider.startCheckout({ organizationId: 'org-1', plan: 'basic', method: 'card', customerId: null, ...back })

    const notice = await provider.readWebhook(
      Buffer.from(JSON.stringify({ command: 'checkout.complete', organizationId: 'org-1' })),
      { 'fake-billing-token': 'fake-billing-token-1' }
    )

    expect(provider.name).toBe('fake')
    expect(notice).toMatchObject({ subscriptionId: expect.any(String) })
  })

  it('completes checkouts by itself in development, handing the notices to whoever listens', async () => {
    const timer = new ManualTimer(clock)
    const provider = createBillingProvider(
      { kind: 'fake', token: undefined },
      { clock, ids, autoComplete: { afterMs: 3000, timer } }
    )
    const notices: BillingNotice[] = []
    provider.listen?.(async (notice) => {
      notices.push(notice)
    })

    await provider.startCheckout({ organizationId: 'org-1', plan: 'basic', method: 'card', customerId: null, ...back })
    timer.advance(3000)

    await vi.waitFor(() => expect(notices).toHaveLength(1))
  })
})
