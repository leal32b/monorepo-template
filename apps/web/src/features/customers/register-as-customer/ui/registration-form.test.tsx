import type { PublicOrganization } from '@repo/contracts'
import { motion } from '@repo/ui'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RegistrationForm } from './registration-form'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const acme: PublicOrganization = {
  name: 'Acme Barbershop',
  slug: 'acme',
  timeZone: 'America/Sao_Paulo',
  currency: 'BRL'
}
const received = () => Response.json({ received: true }, { status: 202 })
const limited = (retryAfter: number) => () =>
  Response.json(
    { type: 'urn:problem:rate_limited', title: 'Too many', status: 429, code: 'rate_limited', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )

function renderForm(fetch: Fetch) {
  const view = render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch })}>
        <RegistrationForm organization={acme} />
      </ApiProvider>
    </I18nProvider>
  ))
  return view
}

const field = (name: string) => screen.getByRole('textbox', { name })
const type = (name: string, value: string) => fireEvent.input(field(name), { target: { value } })
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send my details' }))
const body = (fetch: ReturnType<typeof vi.fn<Fetch>>, call = 0) =>
  JSON.parse(String(fetch.mock.calls[call]?.[1]?.body)) as unknown

describe('RegistrationForm', () => {
  it('asks for a name, then an email or a phone, saying before anything is sent that one is enough', () => {
    renderForm(vi.fn<Fetch>())

    expect(field('Your name')).toHaveAttribute('autocomplete', 'name')
    expect(screen.getByRole('group', { name: 'How can Acme Barbershop reach you?' })).toBeInTheDocument()
    expect(field('Email')).toHaveAttribute('autocomplete', 'email')
    expect(field('Phone')).toHaveAttribute('autocomplete', 'tel')
    expect(screen.getByText('An email or a phone is enough.')).toBeInTheDocument()
  })

  it('keeps the honeypot out of every person’s reach: unseen, unread, not in the tab order, not filled', () => {
    const { container } = renderForm(vi.fn<Fetch>())
    const trap = container.querySelector<HTMLInputElement>('input[name="referralCode"]')

    expect(trap).toHaveAttribute('tabindex', '-1')
    expect(trap).toHaveAttribute('autocomplete', 'off')
    expect(trap?.closest('[aria-hidden="true"]')).toHaveClass('absolute', 'overflow-hidden')
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
  })

  it('sends what was typed, cleaned, with the honeypot as it is, then says only that it was received', async () => {
    const fetch = vi.fn<Fetch>(async () => received())
    renderForm(fetch)

    type('Your name', ' Carla Client ')
    type('Email', 'Carla@Example.com')
    send()

    const done = await screen.findByRole('status')
    expect(done).toHaveTextContent(
      'Acme Barbershop received your details. If they need anything else, they will reach you.'
    )
    expect(done).toHaveFocus()
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/public/organizations/acme/customer-registrations')
    expect(body(fetch)).toEqual({ name: 'Carla Client', email: 'carla@example.com', referralCode: '' })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('sends what a robot put in the honeypot, so the API can drop it', async () => {
    const fetch = vi.fn<Fetch>(async () => received())
    const { container } = renderForm(fetch)
    const trap = container.querySelector('input[name="referralCode"]') as HTMLInputElement
    trap.value = 'BOT-123'

    type('Your name', 'Bot')
    type('Phone', '1')
    send()

    await screen.findByRole('status')
    expect(body(fetch)).toEqual({ name: 'Bot', phone: '1', referralCode: 'BOT-123' })
  })

  it('says what to fix before anything is sent, and goes to the first field at fault', () => {
    const fetch = vi.fn<Fetch>()
    renderForm(fetch)

    send()

    expect(field('Your name')).toHaveAccessibleDescription('Enter your name.')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an email or a phone, so they can reach you.')
    expect(field('Your name')).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('goes to the email when the name is fine and no way to reach the visitor was given', () => {
    renderForm(vi.fn<Fetch>())

    type('Your name', 'Carla')
    send()

    expect(screen.queryByText('An email or a phone is enough.')).not.toBeInTheDocument()
    expect(field('Email')).toHaveFocus()
  })

  it('says an email is not one under the email', () => {
    renderForm(vi.fn<Fetch>())

    type('Your name', 'Carla')
    type('Email', 'carla')
    send()

    expect(field('Email')).toHaveAccessibleDescription('Enter an email address, like ada@example.com.')
    expect(field('Email')).toHaveFocus()
  })

  it('says how long a phone may be', () => {
    renderForm(vi.fn<Fetch>())

    type('Your name', 'Carla')
    type('Phone', '1'.repeat(41))
    send()

    expect(field('Phone')).toHaveAccessibleDescription('Use at most 40 characters.')
  })

  it('sends once however often the button is pressed while the request is out', async () => {
    let answer: (response: Response) => void = () => undefined
    const fetch = vi.fn<Fetch>(() => new Promise<Response>((resolve) => (answer = resolve)))
    renderForm(fetch)
    type('Your name', 'Carla')
    type('Phone', '1')

    send()
    send()

    expect(screen.getByRole('button', { name: 'Send my details' })).toBeDisabled()
    expect(fetch).toHaveBeenCalledTimes(1)
    answer(received())
    await screen.findByRole('status')
  })

  it('says when to try again after too many registrations, and keeps what was typed', async () => {
    renderForm(vi.fn<Fetch>(async () => limited(45)()))
    type('Your name', 'Carla')
    type('Phone', '+55 11 99999-0000')

    send()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts from this connection. Try again in 45 seconds.'
    )
    expect(field('Your name')).toHaveValue('Carla')
    expect(field('Phone')).toHaveValue('+55 11 99999-0000')
    expect(screen.getByRole('button', { name: 'Send my details' })).toBeEnabled()
  })

  it('says the server could not be reached, keeps what was typed, and sends again on the next press', async () => {
    const fetch = vi.fn<Fetch>().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(received())
    renderForm(fetch)
    type('Your name', 'Carla')
    type('Phone', '1')

    send()

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach the server.')
    expect(field('Your name')).toHaveValue('Carla')
    send()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('received your details'))
  })

  describe('a slow answer', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }))
    afterEach(() => vi.useRealTimers())

    it('says why once it takes long: the server may be waking up (ADR 0041)', () => {
      renderForm(vi.fn<Fetch>(() => new Promise<Response>(() => undefined)))
      type('Your name', 'Carla')
      type('Phone', '1')
      send()

      vi.advanceTimersByTime(motion.slowWaitDelay - 1)
      expect(screen.queryByText(/taking longer than usual/)).not.toBeInTheDocument()

      vi.advanceTimersByTime(1)
      expect(screen.getByText(/taking longer than usual/)).toBeInTheDocument()
    })
  })
})
