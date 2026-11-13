import type { Subscription } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider, type Locale } from '#shared/config'
import { SubscriptionNotice } from './subscription-notice'

const late: Subscription = {
  status: 'past_due',
  access: 'full',
  plan: 'pro',
  nextPlan: null,
  trialEndsAt: '2026-10-01T00:00:00.000Z',
  periodStartsAt: '2026-10-03T12:00:00.000Z',
  paidThrough: '2026-11-03T12:00:00.000Z',
  pastDueSince: '2026-11-03T12:00:00.000Z',
  cancelAtPeriodEnd: false,
  checkout: null
}

function renderNotice(props: {
  subscription: Subscription
  manages: boolean
  timeZone?: string
  plansHref?: string
  locale?: Locale
}) {
  const history = createMemoryHistory()
  history.set({ value: '/acme/customers' })
  render(() => (
    <I18nProvider locale={props.locale ?? 'en'}>
      <MemoryRouter history={history}>
        <Route
          path="*"
          component={() => (
            <SubscriptionNotice
              subscription={props.subscription}
              manages={props.manages}
              timeZone={props.timeZone ?? 'America/Sao_Paulo'}
              plansHref={props.plansHref}
            />
          )}
        />
      </MemoryRouter>
    </I18nProvider>
  ))
}

describe('SubscriptionNotice (ADR 0063)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-06T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('warns the owner of a late payment, dated in the organization’s time zone, with the way to pay', () => {
    renderNotice({ subscription: late, manages: true, plansHref: '/acme/settings/billing' })

    expect(screen.getByRole('status')).toHaveTextContent(
      'We have not received the payment due on Nov 3, 2026. Pay by Nov 17, 2026 to keep editing. Nothing is deleted.'
    )
    expect(screen.getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/acme/settings/billing')
  })

  it('tells another member who can act, with nothing to press', () => {
    renderNotice({ subscription: late, manages: false, plansHref: '/acme/settings/billing', locale: 'pt-BR' })

    expect(screen.getByRole('status')).toHaveTextContent(
      'O pagamento desta organização está atrasado. A partir de 17 de nov. de 2026, ela fica somente leitura até que um proprietário pague.'
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('names the day as it is where the organization is', () => {
    renderNotice({
      subscription: { ...late, pastDueSince: '2026-11-03T23:30:00.000Z' },
      manages: true,
      timeZone: 'Asia/Tokyo'
    })

    expect(screen.getByRole('status')).toHaveTextContent('payment due on Nov 4, 2026. Pay by Nov 18, 2026')
  })

  it('draws no action where there is nowhere to go, such as the plan page itself', () => {
    renderNotice({ subscription: late, manages: true })

    expect(screen.getByRole('status').querySelector('.mt-2')).toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('draws nothing for a state with nothing to say', () => {
    renderNotice({ subscription: { ...late, status: 'active', pastDueSince: null }, manages: true })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
