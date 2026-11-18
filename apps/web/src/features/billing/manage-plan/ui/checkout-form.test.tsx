import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { CheckoutForm, type CheckoutFormProps } from './checkout-form'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const refused = (code: string, status = 409) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code, requestId: 'req-9' }, { status })

function renderForm(fetch: Fetch, props: Partial<CheckoutFormProps> = {}) {
  const handlers = { onChanged: vi.fn(), onStale: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch })}>
        <CheckoutForm
          organizationId="org-1"
          plan="pro"
          version={2}
          returnTo="/acme/settings/billing"
          message="You pay R$99.00 now, then every month."
          {...handlers}
          {...props}
        />
      </ApiProvider>
    </I18nProvider>
  ))
  return handlers
}

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('CheckoutForm (ADR 0067)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('says what it costs, asks how to pay, and goes to the provider’s page', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined)
    const fetch = vi.fn<Fetch>(async () => Response.json({ url: 'https://pay.example/c/1' }))
    renderForm(fetch)

    expect(screen.getByText('You pay R$99.00 now, then every month.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Card' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Pix' }))
    press('Continue to payment')

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/c/1'))
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org-1/billing/checkout')
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      plan: 'pro',
      method: 'pix',
      version: 2,
      returnTo: '/acme/settings/billing'
    })
    // Leaving for the provider: the button keeps waiting, so a second press sends nothing.
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled()
  })

  it('asks whom a subscription charges, with the owner’s email filled in, and sends it (ADR 0069)', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined)
    const fetch = vi.fn<Fetch>(async () => Response.json({ url: 'https://pay.example/c/1' }))
    renderForm(fetch, { payerEmail: 'owner@example.com' })

    expect(screen.getByRole('textbox', { name: 'Email for charges' })).toHaveValue('owner@example.com')
    fireEvent.input(screen.getByRole('textbox', { name: 'Name or company name' }), {
      target: { value: 'Barbearia do Zé' }
    })
    fireEvent.input(screen.getByRole('textbox', { name: 'CPF or CNPJ' }), { target: { value: '11.222.333/0001-81' } })
    press('Continue to payment')

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/c/1'))
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({
      payer: { name: 'Barbearia do Zé', taxId: '11222333000181', email: 'owner@example.com' }
    })
  })

  it('says what to fix in the payer before anything is sent, focusing the first field at fault', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ url: 'https://pay.example/c/1' }))
    renderForm(fetch, { payerEmail: 'owner@example.com' })

    fireEvent.input(screen.getByRole('textbox', { name: 'CPF or CNPJ' }), { target: { value: '111.111.111-11' } })
    press('Continue to payment')

    expect(await screen.findByText('Enter the name the charges are issued to.')).toBeInTheDocument()
    expect(screen.getByText('Check the CPF or CNPJ: it is not valid.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name or company name' })).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks no payer for an upgrade: the provider already charges someone', () => {
    renderForm(async () => Response.json({ url: null }))

    expect(screen.queryByRole('textbox', { name: 'Name or company name' })).not.toBeInTheDocument()
  })

  it('changes the plan at once below the provider’s minimum, asking no way to pay', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ url: null }))
    const { onChanged } = renderForm(fetch, { free: true, message: 'Pro starts now.' })

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    press('Change to Pro')

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce())
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({ plan: 'pro', method: 'card' })
  })

  it('hands a refusal of the subscription’s state to the page, which reads it again and says it', async () => {
    const { onStale } = renderForm(async () => refused('checkout_open'))

    press('Continue to payment')

    await waitFor(() => expect(onStale).toHaveBeenCalledWith(expect.objectContaining({ code: 'checkout_open' })))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeEnabled()
  })

  it('says the provider is not answering, and that nothing changed', async () => {
    const { onStale } = renderForm(async () => refused('service_unavailable', 503))

    press('Continue to payment')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The payment provider is not answering. Nothing was changed: try again in a moment.'
    )
    expect(onStale).not.toHaveBeenCalled()
  })

  it('says what it has no words for with its reference, and closes on Cancel', async () => {
    const { onCancel } = renderForm(async () => refused('boom', 500))

    press('Continue to payment')

    expect(await screen.findByRole('alert')).toHaveTextContent('boom · req-9')
    press('Cancel')
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
