import { fireEvent, render, screen } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { SendPasswordLink } from './send-password-link'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function renderLink(fetch: Fetch) {
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <SendPasswordLink email="ada@example.com" />
      </AuthProvider>
    </I18nProvider>
  ))
  return screen.getByRole('button', { name: 'Create a password' })
}

describe('SendPasswordLink', () => {
  it('sends the account its link to create a password, and says where it went', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ status: true }))
    const button = renderLink(fetch)

    fireEvent.click(button)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'We sent a link to ada@example.com to create your password. It works for 1 hour.'
    )
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'ada@example.com',
      redirectTo: '/reset-password'
    })
  })

  it('says what went wrong', async () => {
    const button = renderLink(async () => Response.json({ message: 'Too many requests.' }, { status: 429 }))

    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })
})
