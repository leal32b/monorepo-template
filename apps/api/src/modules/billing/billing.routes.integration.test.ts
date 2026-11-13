import { apiProblemSchema, billingPageSchema, billingSchema, type Permissions } from '@repo/contracts'
import { serveRoutes } from '#modules/identity/testing/serve-routes'
import { registerBillingRoutes } from './billing.routes'
import { billingKit } from './testing/billing-kit'
import { subscribed } from './testing/subscribed'

const owner: Permissions = { billing: ['manage'] }
const base = '/api/organizations/org-1/billing'
const returnTo = '/acme/settings/billing'

/** The routes behind the real pipeline, with the tenant guard on fakes and billing on the kit. */
async function serve() {
  const kit = billingKit()
  const { signInAs, call, code } = await serveRoutes((router, { session, membership }) =>
    registerBillingRoutes(router, {
      session,
      membership,
      unitOfWork: kit.unitOfWork,
      provider: kit.provider,
      clock: kit.clock,
      ids: kit.ids,
      webOrigin: 'http://localhost:5173'
    })
  )
  return { ...kit, signInAs, call, code }
}

describe('the billing routes (ADR 0063)', () => {
  it('reads the plan page, then opens a first checkout and shows its page', async () => {
    const { signInAs, call } = await serve()
    signInAs(owner, {
      subscription: { status: 'trialing', plan: null, trialEndsAt: new Date('2026-11-25T12:00:00.000Z') }
    })

    const before = billingSchema.parse(await (await call('GET', base)).json())
    const opened = await call('POST', `${base}/checkout`, { plan: 'pro', method: 'card', version: 0, returnTo })
    const after = billingSchema.parse(await (await call('GET', base)).json())

    expect(before).toMatchObject({
      version: 0,
      subscription: { status: 'trialing', trialEndsAt: '2026-11-25T12:00:00.000Z' }
    })
    expect(opened.status).toBe(200)
    expect(billingPageSchema.parse(await opened.json())).toEqual({
      url: `http://localhost:5173${returnTo}?checkout=returned`
    })
    expect(after).toMatchObject({
      version: 2,
      checkoutUrl: expect.any(String),
      subscription: { checkout: { plan: 'pro' } }
    })
  })

  it('lets the owner pay while the organization is read only', async () => {
    const { signInAs, call } = await serve()
    signInAs(owner, { subscription: { status: 'trialing', plan: null, access: 'read-only' } })

    const response = await call('POST', `${base}/checkout`, { plan: 'basic', method: 'boleto', version: 0, returnTo })

    expect(response.status).toBe(200)
  })

  it('schedules a downgrade, withdraws it, cancels and keeps the plan, each answering 204', async () => {
    const kit = await serve()
    kit.signInAs(owner)
    const row = await subscribed(kit, { plan: 'pro' })

    expect((await kit.call('PUT', `${base}/plan`, { plan: 'basic', version: row.version })).status).toBe(204)
    expect((await kit.call('PUT', `${base}/plan`, { plan: 'pro', version: row.version + 1 })).status).toBe(204)
    expect((await kit.call('POST', `${base}/cancel`, { version: row.version + 2 })).status).toBe(204)
    expect((await kit.call('POST', `${base}/resume`, { version: row.version + 3 })).status).toBe(204)
    expect((await kit.entries()).map((entry) => entry.action)).toEqual([
      'cancellation-withdrawn',
      'cancellation-scheduled',
      'downgrade-withdrawn',
      'downgrade-scheduled'
    ])
  })

  it('drops the open checkout, and reads the page for what is overdue', async () => {
    const kit = await serve()
    kit.signInAs(owner)
    const row = await subscribed(kit)
    await kit.call('POST', `${base}/checkout`, { plan: 'pro', method: 'pix', version: row.version, returnTo })

    expect((await kit.call('DELETE', `${base}/checkout`)).status).toBe(204)
    expect(billingPageSchema.parse(await (await kit.call('GET', `${base}/payment-page`)).json())).toEqual({ url: null })
  })

  it('says why a change was refused, with a 409 and its code', async () => {
    const kit = await serve()
    kit.signInAs(owner)
    const row = await subscribed(kit, { plan: 'pro' })

    expect(await kit.code(await kit.call('PUT', `${base}/plan`, { plan: 'basic', version: 9 }))).toEqual({
      status: 409,
      code: 'subscription_changed'
    })
    expect(
      await kit.code(
        await kit.call('POST', `${base}/checkout`, { plan: 'basic', method: 'card', version: row.version, returnTo })
      )
    ).toEqual({
      status: 409,
      code: 'plan_change_not_allowed'
    })
  })

  it('answers 503 when the provider is out of reach, and nothing has changed', async () => {
    const kit = await serve()
    kit.signInAs(owner)
    kit.provider.failNextCall()

    const response = await kit.call('POST', `${base}/checkout`, { plan: 'pro', method: 'card', version: 0, returnTo })

    expect(response.status).toBe(503)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('service_unavailable')
    expect(await kit.subscriptions.find('org-1')).toMatchObject({ checkout: null })
  })

  it('refuses a path of the web that is a whole URL', async () => {
    const { signInAs, call, code } = await serve()
    signInAs(owner)

    expect(
      await code(
        await call('POST', `${base}/checkout`, {
          plan: 'pro',
          method: 'card',
          version: 0,
          returnTo: 'https://evil.example'
        })
      )
    ).toEqual({ status: 400, code: 'validation_failed' })
  })

  it.each([
    ['GET', base, undefined],
    ['GET', `${base}/payment-page`, undefined],
    ['POST', `${base}/checkout`, { plan: 'pro', method: 'card', version: 0, returnTo }],
    ['DELETE', `${base}/checkout`, undefined],
    ['PUT', `${base}/plan`, { plan: 'basic', version: 0 }],
    ['POST', `${base}/cancel`, { version: 0 }],
    ['POST', `${base}/resume`, { version: 0 }]
  ])('refuses %s %s to a member who is not the owner, whatever else they hold', async (method, path, body) => {
    const { signInAs, call, code, subscriptions } = await serve()
    signInAs({ organization: ['update'], member: ['create', 'update', 'delete'], customer: ['read', 'create'] })

    expect(await code(await call(method, path, body))).toEqual({ status: 403, code: 'permission_denied' })
    expect(await subscriptions.find('org-1')).toBeNull()
  })
})
