import {
  type Billing,
  builtInRoles,
  type OrganizationMembership,
  type Permissions,
  type Subscription
} from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import type { ParentProps } from 'solid-js'
import { CurrentOrganizationProvider, OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider, ThemeProvider } from '#shared/config'
import { membershipOf } from '../../../test-membership'
import { OrganizationBillingPage } from './organization-billing-page'

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }
const now = new Date('2026-11-20T12:00:00.000Z').getTime()
const day = 24 * 60 * 60 * 1000
const at = (days: number) => new Date(now + days * day).toISOString()

const trial: Subscription = {
  status: 'trialing',
  access: 'full',
  plan: null,
  nextPlan: null,
  trialEndsAt: at(11.5),
  periodStartsAt: null,
  paidThrough: null,
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  checkout: null
}
const basic: Subscription = {
  ...trial,
  status: 'active',
  plan: 'basic',
  trialEndsAt: at(-20),
  periodStartsAt: at(-18),
  paidThrough: at(12)
}

const billingOf = (subscription: Subscription, over: Partial<Billing> = {}): Billing => ({
  subscription,
  version: subscription.status === 'trialing' ? 0 : 3,
  reference: subscription.status === 'trialing' ? null : 'sub_123',
  checkoutUrl: null,
  checkoutExpiresAt: null,
  minimumCharge: { amount: 500, currency: 'BRL' },
  ...over
})

const refused = (code: string, status = 409) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code }, { status })

/** The billing routes in memory: the read answers the state set last, each write what the test says (204 by default). */
function fakeApi(initial: Billing, answers: Record<string, () => Response> = {}) {
  let billing = initial
  const calls: string[] = []
  const fetch = async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    const call = `${init?.method ?? 'GET'} ${url.pathname.replace('/api/organizations/org-1/billing', '')}`
    calls.push(init?.body === undefined ? call : `${call} ${init.body}`)
    const answer = answers[call]
    if (answer !== undefined) return answer()
    if (call === 'GET ') return Response.json(billing)
    return new Response(null, { status: 204 })
  }
  return {
    fetch,
    calls,
    set: (next: Billing) => {
      billing = next
    },
    reads: () => calls.filter((call) => call === 'GET ').length
  }
}

const owner = membershipOf(['owner'], builtInRoles.owner as Permissions)

const members = {
  members: [
    {
      id: 'm1',
      userId: 'u1',
      role: 'owner',
      createdAt: at(-40),
      user: { name: 'Olivia Owner', email: 'o@example.com' }
    },
    { id: 'm2', userId: 'u2', role: 'member', createdAt: at(-30), user: { name: 'Max Member', email: 'm@example.com' } }
  ],
  total: 2
}

function renderPage({
  api,
  path = '/acme/settings/billing',
  membership = owner,
  auth = async (input: RequestInfo | URL) =>
    String(input).includes('list-members') ? Response.json(members) : Response.json([acme])
}: {
  api: ReturnType<typeof fakeApi>
  path?: string
  membership?: OrganizationMembership
  auth?: (input: RequestInfo | URL) => Promise<Response>
}) {
  const refresh = vi.fn(async () => undefined)
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: api.fetch })}>
            <AuthProvider client={createAuthClient({ fetch: auth })}>
              <SessionProvider user={{ id: 'u1', email: 'o@example.com', name: 'Olivia Owner' }}>
                <MemoryRouter history={history}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route
                      path="/:orgSlug"
                      component={(props: ParentProps) => (
                        <CurrentOrganizationProvider organization={acme} membership={membership} refresh={refresh}>
                          {props.children}
                        </CurrentOrganizationProvider>
                      )}
                    >
                      <Route path="/settings/billing" component={OrganizationBillingPage} />
                    </Route>
                  </Route>
                </MemoryRouter>
              </SessionProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
  return { refresh, history }
}

const yourPlan = async () => within(await screen.findByRole('region', { name: 'Your plan' }))
const catalogue = () => within(screen.getByRole('region', { name: 'Plans' }))
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('OrganizationBillingPage (ADR 0063, ADR 0067)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('for the owner', () => {
    it('shows the trial and the plans in words, with nothing to cancel yet', async () => {
      const api = fakeApi(billingOf(trial))
      renderPage({ api })

      expect(await screen.findByRole('heading', { level: 1, name: 'Plan and billing' })).toBeInTheDocument()
      const plan = await yourPlan()
      expect(plan.getByText('Trial', { selector: 'span' })).toBeInTheDocument()
      expect(plan.getByText('Free trial until Dec 2, 2026 (12 days left).')).toBeInTheDocument()
      expect(screen.getByText('What Acme pays for, and until when.')).toBeInTheDocument()
      expect(catalogue().getByText('R$49.00 a month · Up to 100 active customers')).toBeInTheDocument()
      expect(catalogue().getByText('R$99.00 a month · Unlimited customers · Activity log')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cancel plan' })).not.toBeInTheDocument()
      expect(screen.queryByText('Reference for support')).not.toBeInTheDocument()
      expect(api.calls).toEqual(['GET '])
    })

    it('subscribes on trial: says the price, asks how to pay, and goes to the provider’s page', async () => {
      const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined)
      const api = fakeApi(billingOf(trial), {
        'POST /checkout': () => Response.json({ url: 'https://pay.example/c/1' })
      })
      renderPage({ api })
      await yourPlan()

      press('Choose Pro')
      expect(
        screen.getByText('You pay R$99.00 now, then every month. Pro starts as soon as the payment is confirmed.')
      ).toBeInTheDocument()
      fireEvent.click(screen.getByRole('radio', { name: 'Boleto' }))
      press('Continue to payment')

      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/c/1'))
      expect(api.calls).toContain(
        'POST /checkout {"plan":"pro","method":"boleto","version":0,"returnTo":"/acme/settings/billing"}'
      )
    })

    it('upgrades for the difference over the days left, saying from when the new price runs', async () => {
      renderPage({ api: fakeApi(billingOf(basic)) })
      await yourPlan()

      expect(catalogue().getByText('Current plan')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Choose Basic' })).not.toBeInTheDocument()
      press('Choose Pro')

      expect(
        screen.getByText(
          'You pay R$20.00 now for what is left of the period (12 days); from Dec 2, 2026, R$99.00 a month. Pro starts as soon as the payment is confirmed.'
        )
      ).toBeInTheDocument()
    })

    it('upgrades at once below the provider’s minimum, and reads the plan again', async () => {
      const lastDay = { ...basic, paidThrough: at(0.5) }
      const api = fakeApi(billingOf(lastDay), { 'POST /checkout': () => Response.json({ url: null }) })
      const { refresh } = renderPage({ api })
      await yourPlan()

      press('Choose Pro')
      expect(
        screen.getByText(
          'Pro starts now. There is nothing to pay for what is left of the period (1 day); from Nov 21, 2026 it costs R$99.00 a month.'
        )
      ).toBeInTheDocument()
      api.set(billingOf({ ...lastDay, plan: 'pro' }))
      press('Change to Pro')

      expect(await catalogue().findByText('You are on Pro now.')).toBeInTheDocument()
      await waitFor(() => expect(api.reads()).toBe(2))
      expect(refresh).toHaveBeenCalled()
    })

    it('schedules a cheaper plan for the end of the period, and keeps the current one again', async () => {
      const pro = { ...basic, plan: 'pro' as const }
      const api = fakeApi(billingOf(pro))
      renderPage({ api })
      await yourPlan()

      press('Choose Basic')
      expect(
        screen.getByText(
          'Basic starts on Dec 2, 2026, when the paid period ends. You keep Pro until then, and nothing is refunded.'
        )
      ).toBeInTheDocument()
      api.set(billingOf({ ...pro, nextPlan: 'basic' }))
      press('Change to Basic')

      expect(await catalogue().findByText('Basic starts on Dec 2, 2026.')).toBeInTheDocument()
      expect(api.calls).toContain('PUT /plan {"plan":"basic","version":3}')
      const plan = await yourPlan()
      expect(await plan.findByText('Changes to Basic on Dec 2, 2026')).toBeInTheDocument()
      expect(plan.getByText('You keep Pro until then. Nothing is refunded.')).toBeInTheDocument()

      api.set(billingOf(pro))
      press('Keep Pro')

      expect(await plan.findByText('You keep Pro. Nothing changes.')).toBeInTheDocument()
      expect(api.calls).toContain('PUT /plan {"plan":"pro","version":3}')
    })

    it('waits for an open payment, which can be opened again or cancelled, and holds the other plans', async () => {
      const waiting = {
        ...trial,
        checkout: {
          kind: 'subscription' as const,
          plan: 'basic' as const,
          amount: { amount: 4900, currency: 'BRL' as const }
        }
      }
      const api = fakeApi(billingOf(waiting, { checkoutUrl: 'https://pay.example/c/1' }))
      renderPage({ api })
      const plan = await yourPlan()

      expect(plan.getByText('Subscribe to Basic')).toBeInTheDocument()
      expect(
        plan.getByText(
          'Waiting for the payment of R$49.00. Basic starts as soon as it is confirmed: a card in seconds, Pix in minutes, a boleto in up to three business days.'
        )
      ).toBeInTheDocument()
      expect(plan.getByRole('link', { name: 'Open the payment' })).toHaveAttribute('href', 'https://pay.example/c/1')
      expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeDisabled()
      expect(catalogue().getByText('Pay or cancel the open payment first.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Choose Basic' })).not.toBeInTheDocument()

      api.set(billingOf(trial))
      press('Cancel the payment')

      expect(await plan.findByText('The payment for Basic was cancelled. Nothing was charged.')).toBeInTheDocument()
      expect(api.calls).toContain('DELETE /checkout')
    })

    it('names an upgrade waiting for its payment, with no page to open once it lapsed', async () => {
      const upgrading = {
        ...basic,
        checkout: { kind: 'upgrade' as const, plan: 'pro' as const, amount: { amount: 2000, currency: 'BRL' as const } }
      }
      const api = fakeApi(billingOf(upgrading))
      renderPage({ api })
      const plan = await yourPlan()

      expect(plan.getByText('Upgrade to Pro')).toBeInTheDocument()
      expect(plan.queryByRole('link', { name: 'Open the payment' })).not.toBeInTheDocument()
      api.set(billingOf(basic))
      press('Cancel the upgrade')

      expect(
        await plan.findByText('The upgrade to Pro was cancelled. You are still on Basic, and nothing was charged.')
      ).toBeInTheDocument()
    })

    it('keeps a plan set to end, and holds a change until it is kept', async () => {
      const ending = { ...basic, cancelAtPeriodEnd: true }
      const api = fakeApi(billingOf(ending))
      renderPage({ api })
      const plan = await yourPlan()

      expect(plan.getByText('Ends on Dec 2, 2026')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeDisabled()
      expect(catalogue().getByText('Keep the plan first, then change it.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cancel plan' })).not.toBeInTheDocument()
      api.set(billingOf(basic))
      press('Keep the plan')

      expect(await plan.findByText('Your plan continues. Nothing changes.')).toBeInTheDocument()
      expect(api.calls).toContain('POST /resume {"version":3}')
    })

    it('pays a late payment through a new checkout when the provider has no page for it', async () => {
      const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined)
      const late = { ...basic, status: 'past_due' as const, pastDueSince: at(-3) }
      const api = fakeApi(billingOf(late), {
        'GET /payment-page': () => Response.json({ url: null }),
        'POST /checkout': () => Response.json({ url: 'https://pay.example/c/2' })
      })
      renderPage({ api })
      const plan = await yourPlan()

      expect(plan.getByText('Payment late', { selector: 'div' })).toBeInTheDocument()
      expect(plan.getByText('Pay by Dec 1, 2026 to keep editing. Nothing is deleted.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeDisabled()
      expect(catalogue().getByText('Pay what is late first.')).toBeInTheDocument()
      press('Pay now')

      expect(
        await screen.findByText(
          'The provider has no page for the late payment, so a new subscription to Basic replaces it: you pay R$49.00 now, then every month.'
        )
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument()
      press('Continue to payment')

      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/c/2'))
      expect(api.calls).toContain(
        'POST /checkout {"plan":"basic","method":"card","version":3,"returnTo":"/acme/settings/billing"}'
      )
    })

    it('says read only since the grace period ended, with the way to pay', async () => {
      const over = { ...basic, status: 'past_due' as const, pastDueSince: at(-16), access: 'read-only' as const }
      renderPage({ api: fakeApi(billingOf(over)) })
      const plan = await yourPlan()

      expect(plan.getByText('Read only', { selector: 'span' })).toBeInTheDocument()
      expect(
        plan.getByText('The organization is read only since Nov 18, 2026. Pay to edit again. Nothing was deleted.')
      ).toBeInTheDocument()
      expect(plan.getByRole('button', { name: 'Pay now' })).toBeEnabled()
    })

    it('cancels the plan at the end of its period, asking once, and gives the reference for support', async () => {
      const api = fakeApi(billingOf(basic))
      renderPage({ api })
      const plan = await yourPlan()

      expect(plan.getByText('Reference for support')).toBeInTheDocument()
      expect(plan.getByText('sub_123')).toBeInTheDocument()
      press('Cancel plan')
      expect(
        screen.getByText(
          'Your plan stays paid until Dec 2, 2026. After that the organization is read only: nothing is deleted, and you can keep the plan until then.'
        )
      ).toBeInTheDocument()
      api.set(billingOf({ ...basic, cancelAtPeriodEnd: true }))
      press('Cancel plan')

      expect(
        await plan.findByText('Your plan ends when its paid period ends. You can keep it until then.')
      ).toBeInTheDocument()
      expect(api.calls).toContain('POST /cancel {"version":3}')
      expect(await plan.findByText('Ends on Dec 2, 2026')).toBeInTheDocument()
    })

    it('asks to cancel a late plan without a date that has passed', async () => {
      const late = { ...basic, status: 'past_due' as const, pastDueSince: at(-3), paidThrough: at(-3) }
      renderPage({ api: fakeApi(billingOf(late)) })
      await yourPlan()

      press('Cancel plan')

      expect(screen.getByText(/^The plan ends when its paid period ends\. After that/)).toBeInTheDocument()
    })

    it('says a refusal of the subscription’s state below its section, and reads it again', async () => {
      const api = fakeApi(billingOf({ ...basic, cancelAtPeriodEnd: true }), {
        'POST /resume': () => refused('subscription_not_active')
      })
      const { refresh } = renderPage({ api })
      await yourPlan()

      press('Keep the plan')

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'There is no paid plan to change yet. Choose a plan first.'
      )
      await waitFor(() => expect(api.reads()).toBe(2))
      expect(refresh).toHaveBeenCalled()
    })

    it('closes a choice the subscription refused, and says why below the plans', async () => {
      const api = fakeApi(billingOf(basic), { 'POST /checkout': () => refused('checkout_open') })
      renderPage({ api })
      await yourPlan()

      press('Choose Pro')
      press('Continue to payment')

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A payment is already open for another plan. Pay it or cancel it first.'
      )
      expect(screen.queryByRole('button', { name: 'Continue to payment' })).not.toBeInTheDocument()
      await waitFor(() => expect(api.reads()).toBe(2))
    })

    it('says the provider out of reach in the panel, which stays open to try again', async () => {
      const api = fakeApi(billingOf(basic), { 'POST /cancel': () => refused('service_unavailable', 503) })
      renderPage({ api })
      await yourPlan()

      press('Cancel plan')
      press('Cancel plan')

      expect(await screen.findByRole('alert')).toHaveTextContent('The payment provider is not answering.')
      expect(screen.getByRole('button', { name: 'Keep the plan' })).toBeInTheDocument()
      expect(api.reads()).toBe(1)
    })

    it('says a refusal of a cancellation below its section, and closes it', async () => {
      const api = fakeApi(billingOf(basic), { 'POST /cancel': () => refused('subscription_changed') })
      renderPage({ api })
      await yourPlan()

      press('Cancel plan')
      press('Cancel plan')

      expect(await screen.findByRole('alert')).toHaveTextContent('The plan changed since this page was read.')
      expect(screen.getByRole('button', { name: 'Cancel plan' })).toBeInTheDocument()
      await waitFor(() => expect(api.reads()).toBe(2))
    })

    it('closes the cancellation when the owner keeps the plan', async () => {
      renderPage({ api: fakeApi(billingOf(basic)) })
      await yourPlan()

      press('Cancel plan')
      press('Keep the plan')

      await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel plan' })).toHaveFocus())
    })

    it('says a refusal of a downgrade below the plans', async () => {
      const api = fakeApi(billingOf({ ...basic, plan: 'pro' }), { 'PUT /plan': () => refused('checkout_open') })
      renderPage({ api })
      await yourPlan()

      press('Choose Basic')
      press('Change to Basic')

      expect(await screen.findByRole('alert')).toHaveTextContent('A payment is already open for another plan.')
    })

    it('says a refusal of paying what is late below its section', async () => {
      const late = { ...basic, status: 'past_due' as const, pastDueSince: at(-3) }
      const api = fakeApi(billingOf(late), {
        'GET /payment-page': () => Response.json({ url: null }),
        'POST /checkout': () => refused('subscription_changed')
      })
      renderPage({ api })
      await yourPlan()

      press('Pay now')
      fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('The plan changed since this page was read.')
      expect(screen.getByRole('button', { name: 'Pay now' })).toBeInTheDocument()
    })

    it('says the provider out of reach for a press, with nothing to read again', async () => {
      const api = fakeApi(billingOf({ ...basic, nextPlan: 'basic', plan: 'pro' }), {
        'PUT /plan': () => refused('service_unavailable', 503)
      })
      renderPage({ api })
      await yourPlan()

      press('Keep Pro')

      expect(await screen.findByRole('alert')).toHaveTextContent('The payment provider is not answering.')
      expect(api.reads()).toBe(1)
    })

    it('says what it could not read, with a way to try again', async () => {
      renderPage({ api: fakeApi(billingOf(trial), { 'GET ': () => refused('boom', 500) }) })

      expect(
        await screen.findByText('We could not load the plan. Check your connection, then try again.')
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    })
  })

  describe('coming back from the provider', () => {
    const waiting = {
      ...basic,
      checkout: { kind: 'upgrade' as const, plan: 'pro' as const, amount: { amount: 2000, currency: 'BRL' as const } }
    }

    beforeEach(() => {
      vi.useFakeTimers({
        toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
        shouldAdvanceTime: true
      })
      vi.setSystemTime(now)
    })

    it('waits for the provider’s confirmation, reading the plan every 3 seconds, then says it', async () => {
      const api = fakeApi(billingOf(waiting))
      const { refresh, history } = renderPage({ api, path: '/acme/settings/billing?checkout=returned' })

      expect(await screen.findByText('Confirming your payment with the provider…')).toBeInTheDocument()
      await waitFor(() => expect(history.get()).toBe('/acme/settings/billing'))
      api.set(billingOf({ ...basic, plan: 'pro' }))
      await vi.advanceTimersByTimeAsync(3000)

      expect(await screen.findByText('Your payment was confirmed. You are on Pro.')).toBeInTheDocument()
      expect(refresh).toHaveBeenCalled()
      const reads = api.reads()
      await vi.advanceTimersByTimeAsync(9000)
      expect(api.reads()).toBe(reads)
    })

    it('says the payment was not made when the open payment went away unpaid', async () => {
      const api = fakeApi(billingOf(waiting))
      renderPage({ api, path: '/acme/settings/billing?checkout=returned' })
      await screen.findByText('Confirming your payment with the provider…')

      api.set(billingOf(basic))
      await vi.advanceTimersByTimeAsync(3000)

      expect(
        await screen.findByText('The upgrade to Pro was not paid. You are still on Basic, and nothing was charged.')
      ).toBeInTheDocument()
    })

    it('stops waiting after a minute, and says the plan starts when the confirmation comes', async () => {
      const api = fakeApi(billingOf(waiting))
      renderPage({ api, path: '/acme/settings/billing?checkout=returned' })
      await screen.findByText('Confirming your payment with the provider…')

      await vi.advanceTimersByTimeAsync(60_000)

      expect(
        await screen.findByText(
          'The provider has not confirmed the payment yet. A boleto or Pix can take a while: Pro starts as soon as it arrives, and you can keep working.'
        )
      ).toBeInTheDocument()
      const reads = api.reads()
      await vi.advanceTimersByTimeAsync(9000)
      expect(api.reads()).toBe(reads)
    })

    it('says a payment confirmed before the page was read', async () => {
      renderPage({ api: fakeApi(billingOf(basic)), path: '/acme/settings/billing?checkout=returned' })

      expect(await screen.findByText('Your payment was confirmed. You are on Basic.')).toBeInTheDocument()
    })

    it('says nothing of a return with no plan and nothing open', async () => {
      renderPage({ api: fakeApi(billingOf(trial)), path: '/acme/settings/billing?checkout=returned' })
      await yourPlan()

      expect(screen.queryByText(/Confirming|confirmed/)).not.toBeInTheDocument()
    })

    it('says that leaving the provider’s page charged nothing', async () => {
      renderPage({ api: fakeApi(billingOf(waiting)), path: '/acme/settings/billing?checkout=cancelled' })

      expect(await screen.findByText('Payment not completed. Nothing was charged.')).toBeInTheDocument()
    })
  })

  describe('for another member', () => {
    const member = (subscription: Subscription): OrganizationMembership => ({
      ...membershipOf(['member'], builtInRoles.member as Permissions),
      subscription
    })

    it('shows the plan and who manages it, with nothing to change and no billing read', async () => {
      const api = fakeApi(billingOf(basic))
      renderPage({ api, membership: member({ ...basic, plan: 'pro' }) })

      const plan = within(await screen.findByRole('region', { name: "Acme's plan" }))
      expect(plan.getByText('R$99.00 a month. Paid until Dec 2, 2026.')).toBeInTheDocument()
      expect(screen.getByText('Only an owner of Acme can choose, change or pay for the plan.')).toBeInTheDocument()
      expect(await plan.findByText('Olivia Owner')).toBeInTheDocument()
      expect(screen.getByText('What each plan includes.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Choose/ })).not.toBeInTheDocument()
      expect(api.calls).toEqual([])
    })

    it('names an owner by role when the members could not be read', async () => {
      renderPage({
        api: fakeApi(billingOf(trial)),
        membership: member(trial),
        auth: async (input) => (String(input).includes('list-members') ? refused('boom', 500) : Response.json([acme]))
      })

      expect(await screen.findByText('An owner of Acme')).toBeInTheDocument()
    })
  })
})
