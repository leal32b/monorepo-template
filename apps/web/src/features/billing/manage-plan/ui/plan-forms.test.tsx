import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import type { JSX } from 'solid-js'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { CancelPlanForm } from './cancel-plan-form'
import { DowngradeForm } from './downgrade-form'
import { PayNowButton } from './pay-now-button'
import { PlanActionButton } from './plan-action-button'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const refused = (code: string, status = 409) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code }, { status })
const done = async () => new Response(null, { status: 204 })

function renderWith(fetch: Fetch, ui: () => JSX.Element) {
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch })}>{ui()}</ApiProvider>
    </I18nProvider>
  ))
}

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>, call = 0) => [
  fetch.mock.calls[call]?.[0],
  fetch.mock.calls[call]?.[1]?.method,
  fetch.mock.calls[call]?.[1]?.body
]

describe('DowngradeForm', () => {
  it('says from when the cheaper plan starts, and schedules it with the version read', async () => {
    const fetch = vi.fn<Fetch>(done)
    const onChanged = vi.fn()
    renderWith(fetch, () => (
      <DowngradeForm
        organizationId="org-1"
        plan="basic"
        version={4}
        message="Basic starts on Dec 10, 2026."
        onChanged={onChanged}
        onStale={vi.fn()}
        onCancel={vi.fn()}
      />
    ))

    expect(screen.getByText('Basic starts on Dec 10, 2026.')).toBeInTheDocument()
    press('Change to Basic')

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce())
    expect(sent(fetch)).toEqual(['/api/organizations/org-1/billing/plan', 'PUT', '{"plan":"basic","version":4}'])
  })

  it('hands a refusal to the page, and says the provider out of reach itself', async () => {
    const onStale = vi.fn()
    let calls = 0
    renderWith(
      async () => (++calls === 1 ? refused('payment_overdue') : refused('service_unavailable', 503)),
      () => (
        <DowngradeForm
          organizationId="org-1"
          plan="basic"
          version={4}
          message="Basic starts later."
          onChanged={vi.fn()}
          onStale={onStale}
          onCancel={vi.fn()}
        />
      )
    )

    press('Change to Basic')
    await waitFor(() => expect(onStale).toHaveBeenCalledWith(expect.objectContaining({ code: 'payment_overdue' })))
    press('Change to Basic')

    expect(await screen.findByRole('alert')).toHaveTextContent('The payment provider is not answering.')
    expect(onStale).toHaveBeenCalledOnce()
  })
})

describe('CancelPlanForm', () => {
  it('asks once, saying until when the plan stays paid, and cancels it at the period’s end', async () => {
    const fetch = vi.fn<Fetch>(done)
    const onChanged = vi.fn()
    const onCancel = vi.fn()
    renderWith(fetch, () => (
      <CancelPlanForm
        organizationId="org-1"
        version={4}
        message="Your plan stays paid until Dec 10, 2026."
        onChanged={onChanged}
        onStale={vi.fn()}
        onCancel={onCancel}
      />
    ))

    expect(screen.getByText('Your plan stays paid until Dec 10, 2026.')).toBeInTheDocument()
    press('Keep the plan')
    expect(onCancel).toHaveBeenCalledOnce()
    press('Cancel plan')

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce())
    expect(sent(fetch)).toEqual(['/api/organizations/org-1/billing/cancel', 'POST', '{"version":4}'])
  })

  it('hands a refusal to the page, and says the provider out of reach itself', async () => {
    const onStale = vi.fn()
    let calls = 0
    renderWith(
      async () => (++calls === 1 ? refused('subscription_changed') : refused('service_unavailable', 503)),
      () => (
        <CancelPlanForm
          organizationId="org-1"
          version={4}
          message="Ends later."
          onChanged={vi.fn()}
          onStale={onStale}
          onCancel={vi.fn()}
        />
      )
    )

    press('Cancel plan')
    await waitFor(() => expect(onStale).toHaveBeenCalledWith(expect.objectContaining({ code: 'subscription_changed' })))
    press('Cancel plan')

    expect(await screen.findByRole('alert')).toHaveTextContent('The payment provider is not answering.')
    expect(onStale).toHaveBeenCalledOnce()
  })
})

describe('PlanActionButton', () => {
  it('keeps a plan set to end', async () => {
    const fetch = vi.fn<Fetch>(done)
    const onDone = vi.fn()
    renderWith(fetch, () => (
      <PlanActionButton
        organizationId="org-1"
        action={{ kind: 'resume' }}
        version={5}
        onDone={onDone}
        onFailed={vi.fn()}
      />
    ))

    press('Keep the plan')

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce())
    expect(sent(fetch)).toEqual(['/api/organizations/org-1/billing/resume', 'POST', '{"version":5}'])
  })

  it('keeps the plan paid for, withdrawing a scheduled downgrade', async () => {
    const fetch = vi.fn<Fetch>(done)
    renderWith(fetch, () => (
      <PlanActionButton
        organizationId="org-1"
        action={{ kind: 'keep', plan: 'pro' }}
        version={5}
        onDone={vi.fn()}
        onFailed={vi.fn()}
      />
    ))

    press('Keep Pro')

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(sent(fetch)).toEqual(['/api/organizations/org-1/billing/plan', 'PUT', '{"plan":"pro","version":5}'])
  })

  it('cancels an open payment, by what it was for', async () => {
    const fetch = vi.fn<Fetch>(done)
    renderWith(fetch, () => (
      <>
        <PlanActionButton
          organizationId="org-1"
          action={{ kind: 'abandon', checkout: 'upgrade' }}
          version={5}
          onDone={vi.fn()}
          onFailed={vi.fn()}
        />
        <PlanActionButton
          organizationId="org-1"
          action={{ kind: 'abandon', checkout: 'subscription' }}
          version={5}
          onDone={vi.fn()}
          onFailed={vi.fn()}
        />
      </>
    ))

    press('Cancel the upgrade')
    expect(screen.getByRole('button', { name: 'Cancel the payment' })).toBeInTheDocument()

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(sent(fetch)).toEqual(['/api/organizations/org-1/billing/checkout', 'DELETE', undefined])
  })

  it('hands back what went wrong, and waits while its request is on its way', async () => {
    let answer: (response: Response) => void = () => undefined
    const onFailed = vi.fn()
    renderWith(
      () => new Promise((resolve) => (answer = resolve)),
      () => (
        <PlanActionButton
          organizationId="org-1"
          action={{ kind: 'resume' }}
          version={5}
          onDone={vi.fn()}
          onFailed={onFailed}
        />
      )
    )

    press('Keep the plan')
    expect(screen.getByRole('button', { name: 'Keep the plan' })).toBeDisabled()
    answer(refused('subscription_not_active'))

    await waitFor(() =>
      expect(onFailed).toHaveBeenCalledWith(expect.objectContaining({ code: 'subscription_not_active' }))
    )
    expect(screen.getByRole('button', { name: 'Keep the plan' })).toBeEnabled()
  })
})

describe('PayNowButton', () => {
  afterEach(() => vi.restoreAllMocks())

  it('goes to the provider’s page for what is overdue', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined)
    const fetch = vi.fn<Fetch>(async () => Response.json({ url: 'https://pay.example/invoice/1' }))
    renderWith(fetch, () => <PayNowButton organizationId="org-1" onNoPage={vi.fn()} onFailed={vi.fn()} />)

    press('Pay now')

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/invoice/1'))
    expect(sent(fetch)[0]).toBe('/api/organizations/org-1/billing/payment-page')
  })

  it('asks for a new checkout when the provider has no such page', async () => {
    const onNoPage = vi.fn()
    renderWith(
      async () => Response.json({ url: null }),
      () => <PayNowButton organizationId="org-1" onNoPage={onNoPage} onFailed={vi.fn()} />
    )

    press('Pay now')

    await waitFor(() => expect(onNoPage).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Pay now' })).toBeEnabled()
  })

  it('hands back what went wrong', async () => {
    const onFailed = vi.fn()
    renderWith(
      async () => refused('service_unavailable', 503),
      () => <PayNowButton organizationId="org-1" onNoPage={vi.fn()} onFailed={onFailed} />
    )

    press('Pay now')

    await waitFor(() => expect(onFailed).toHaveBeenCalledWith(expect.objectContaining({ status: 503 })))
  })
})
