import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ResendConfirmation } from './resend-confirmation'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function renderResend(fetch: Fetch) {
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <ResendConfirmation email="ada@example.com" />
      </AuthProvider>
    </I18nProvider>
  ))
  return screen.getByRole('button', { name: 'Send it again' })
}

describe('ResendConfirmation', () => {
  it('sends the confirmation link again to the address, once at a time, and says so', async () => {
    let answer!: (response: Response) => void
    const fetch = vi.fn<Fetch>(() => new Promise((resolve) => (answer = resolve)))
    const button = renderResend(fetch)

    fireEvent.click(button)
    expect(button).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    answer(Response.json({ status: true }))

    expect(await screen.findByRole('status')).toHaveTextContent('We sent it again. It can take a few minutes.')
    expect(button).toBeEnabled()
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/send-verification-email`)
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'ada@example.com', callbackURL: '/' })
  })

  it('says what went wrong, and clears it on the next try', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json({ message: 'Too many requests.' }, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ status: true }))
    const button = renderResend(fetch)

    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
    fireEvent.click(button)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('We sent it again.')
  })
})
