import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RequestResetForm } from './request-reset-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth's answer to every request: the same whether or not the address has an account (T08). */
const asked = () => Response.json({ status: true })

function renderForm(fetch = vi.fn<Fetch>(async () => asked()), email?: string) {
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <RequestResetForm email={email} />
      </AuthProvider>
    </I18nProvider>
  ))
  return {
    fetch,
    email: screen.getByRole('textbox', { name: 'Email' }),
    button: screen.getByRole('button', { name: 'Send link' })
  }
}

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

describe('RequestResetForm', () => {
  it('starts from the email it is given, and sends it as typed', async () => {
    const { fetch, email, button } = renderForm(undefined, 'ada@example.com')

    expect(email).toHaveValue('ada@example.com')
    fireEvent.click(button)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({ email: 'ada@example.com' })
  })

  it('asks for the email of the account, offering no suggestions', () => {
    const { email } = renderForm()

    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'off')
  })

  it('on a submit with a wrong email, says what to fix and sends nothing', () => {
    const { fetch, email, button } = renderForm()

    type(email, 'ada@')
    fireEvent.click(button)

    expect(email).toHaveAccessibleDescription('Enter an email address, like ada@example.com.')
    expect(email).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks for the link once at a time, and says it went out without saying whether the account exists', async () => {
    let answer!: (response: Response) => void
    const fetch = vi.fn<Fetch>(() => new Promise((resolve) => (answer = resolve)))
    const { email, button } = renderForm(fetch)

    type(email, ' Ada@Example.com ')
    fireEvent.click(button)
    expect(button).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    answer(asked())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account uses ada@example.com, we sent it a link. It works for 1 hour; check spam if it does not arrive.'
    )
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Send link again in 30 s')
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/request-password-reset`)
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'ada@example.com', redirectTo: '/reset-password' })
  })

  it('says what went wrong, and clears it on the next try', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json({ message: 'Too many requests.' }, { status: 429 }))
      .mockResolvedValueOnce(asked())
    const { email, button } = renderForm(fetch)

    type(email, 'ada@example.com')
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
    fireEvent.click(button)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('If an account uses ada@example.com')
  })

  describe('the wait', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }))
    afterEach(() => vi.useRealTimers())

    it('counts out 30 seconds on the button after a send to the same address, then can send again', async () => {
      const { email, button } = renderForm(undefined, 'ada@example.com')
      fireEvent.click(button)
      await screen.findByRole('status')
      expect(button).toBeDisabled()
      vi.advanceTimersByTime(1000)
      expect(button).toHaveTextContent('Send link again in 29 s')

      vi.advanceTimersByTime(29_000)

      expect(button).toBeEnabled()
      expect(button).toHaveTextContent('Send link')
      expect(button).not.toHaveTextContent('again')
      expect(email).toHaveValue('ada@example.com')
    })

    it('lets a corrected address be sent at once, since it is another address', async () => {
      const { email, button } = renderForm(undefined, 'ada@exmaple.com')
      fireEvent.click(button)
      await screen.findByRole('status')
      expect(button).toBeDisabled()

      type(email, 'ada@example.com')

      expect(button).toBeEnabled()
      expect(button).toHaveTextContent('Send link')
    })

    it('does not wait after a failure, so the user can try again', async () => {
      const { button } = renderForm(
        vi.fn<Fetch>(async () => Response.json({}, { status: 500 })),
        'ada@example.com'
      )

      fireEvent.click(button)
      await screen.findByRole('alert')

      expect(button).toBeEnabled()
    })
  })
})
