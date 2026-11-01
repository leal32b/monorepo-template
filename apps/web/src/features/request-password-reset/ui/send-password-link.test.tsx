import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { type AuthFailure, AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { SendPasswordLink } from './send-password-link'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function renderLink(fetch: Fetch) {
  const onSent = vi.fn()
  const onFailure = vi.fn<(failure: AuthFailure) => void>()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <SendPasswordLink email="ada@example.com" onSent={onSent} onFailure={onFailure} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { button: screen.getByRole('button', { name: 'Create a password' }), onSent, onFailure }
}

describe('SendPasswordLink', () => {
  it('sends the account its link to create a password, and tells the screen', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ status: true }))
    const { button, onSent } = renderLink(fetch)

    fireEvent.click(button)

    expect(button).toBeDisabled()
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1))
    expect(button).toBeEnabled()
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'ada@example.com',
      redirectTo: '/reset-password'
    })
  })

  it('tells the screen what went wrong', async () => {
    const { button, onSent, onFailure } = renderLink(async () =>
      Response.json({ message: 'Too many requests.' }, { status: 429 })
    )

    fireEvent.click(button)

    await waitFor(() => expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ status: 429 })))
    expect(onSent).not.toHaveBeenCalled()
  })
})
