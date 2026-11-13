import type { Billing } from '@repo/contracts'
import { createApiClient } from '#shared/api'
import {
  abandonCheckout,
  cancelSubscription,
  changePlan,
  getBilling,
  getPaymentPage,
  resumeSubscription,
  startCheckout
} from './billing-api'
import { billingQuery } from './billing-query'

const billing: Billing = {
  subscription: {
    status: 'active',
    access: 'full',
    plan: 'basic',
    nextPlan: null,
    trialEndsAt: '2026-11-15T00:00:00.000Z',
    periodStartsAt: '2026-11-10T00:00:00.000Z',
    paidThrough: '2026-12-10T00:00:00.000Z',
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    checkout: null
  },
  version: 3,
  reference: 'sub_1',
  checkoutUrl: null,
  checkoutExpiresAt: null,
  minimumCharge: { amount: 500, currency: 'BRL' }
}

/** A client whose fetch records what it was asked and answers `response`. */
function clientAnswering(response: () => Response) {
  const fetch = vi.fn(async (_path: string, _init?: RequestInit) => response())
  return { api: createApiClient({ fetch }), fetch }
}
const sentOf = (fetch: ReturnType<typeof clientAnswering>['fetch']) => ({
  path: fetch.mock.calls[0]?.[0],
  method: fetch.mock.calls[0]?.[1]?.method,
  body: fetch.mock.calls[0]?.[1]?.body
})

describe('the billing reads (ADR 0067)', () => {
  it('reads the plan page’s billing of the organization', async () => {
    const { api, fetch } = clientAnswering(() => Response.json(billing))

    expect(await getBilling(api, 'org/1')).toEqual(billing)
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org%2F1/billing')
  })

  it('keys the router query by the organization', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json(billing))
    const read = billingQuery(createApiClient({ fetch }))

    expect(await read('org-1')).toMatchObject({ version: 3 })
    expect(read.keyFor('org-1')).not.toBe(read.keyFor('org-2'))
  })

  it('asks for the page of what is overdue, which may be none', async () => {
    const { api, fetch } = clientAnswering(() => Response.json({ url: null }))

    expect(await getPaymentPage(api, 'org-1')).toEqual({ url: null })
    expect(sentOf(fetch)).toMatchObject({ path: '/api/organizations/org-1/billing/payment-page', method: 'GET' })
  })

  it('fails with the API’s refusal', async () => {
    const { api } = clientAnswering(() => Response.json({ code: 'permission_denied' }, { status: 403 }))

    await expect(getBilling(api, 'org-1')).rejects.toMatchObject({ status: 403 })
  })
})

describe('the billing writes (ADR 0067)', () => {
  it('opens a checkout with the plan, the way to pay, the version read and the path to come back to', async () => {
    const { api, fetch } = clientAnswering(() => Response.json({ url: 'https://pay.example/c/1' }))

    const page = await startCheckout(api, 'org-1', {
      plan: 'pro',
      method: 'pix',
      version: 3,
      returnTo: '/acme/settings/billing'
    })

    expect(page).toEqual({ url: 'https://pay.example/c/1' })
    expect(sentOf(fetch)).toEqual({
      path: '/api/organizations/org-1/billing/checkout',
      method: 'POST',
      body: '{"plan":"pro","method":"pix","version":3,"returnTo":"/acme/settings/billing"}'
    })
  })

  it('drops the open checkout with a DELETE', async () => {
    const { api, fetch } = clientAnswering(() => new Response(null, { status: 204 }))

    await abandonCheckout(api, 'org-1')

    expect(sentOf(fetch)).toEqual({
      path: '/api/organizations/org-1/billing/checkout',
      method: 'DELETE',
      body: undefined
    })
  })

  it('changes the plan with a PUT of the plan and the version read', async () => {
    const { api, fetch } = clientAnswering(() => new Response(null, { status: 204 }))

    await changePlan(api, 'org-1', { plan: 'basic', version: 3 })

    expect(sentOf(fetch)).toEqual({
      path: '/api/organizations/org-1/billing/plan',
      method: 'PUT',
      body: '{"plan":"basic","version":3}'
    })
  })

  it('cancels and resumes with the version read', async () => {
    const { api, fetch } = clientAnswering(() => new Response(null, { status: 204 }))

    await cancelSubscription(api, 'org-1', { version: 3 })
    await resumeSubscription(api, 'org-1', { version: 4 })

    expect(fetch.mock.calls.map(([path, init]) => [path, init?.method, init?.body])).toEqual([
      ['/api/organizations/org-1/billing/cancel', 'POST', '{"version":3}'],
      ['/api/organizations/org-1/billing/resume', 'POST', '{"version":4}']
    ])
  })
})
