import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { UnlinkGoogle } from './unlink-google'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function renderUnlink(fetch = vi.fn<Fetch>(async () => Response.json({ status: true }))) {
  const onUnlinked = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <MemoryRouter>
          <Route path="/" component={() => <UnlinkGoogle accountId="a1" onUnlinked={onUnlinked} />} />
        </MemoryRouter>
      </AuthProvider>
    </I18nProvider>
  ))
  fireEvent.click(screen.getByRole('button', { name: 'Unlink Google' }))
  return { fetch, onUnlinked }
}

describe('UnlinkGoogle', () => {
  it('unlinks the Google account', async () => {
    const { fetch, onUnlinked } = renderUnlink()

    await waitFor(() => expect(onUnlinked).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/unlink-account`)
    expect(JSON.parse(String(init?.body))).toEqual({ accountId: 'a1' })
  })

  it('asks to sign in again when the session is too old for it', async () => {
    const { onUnlinked } = renderUnlink(
      vi.fn<Fetch>(async () => Response.json({ code: 'SESSION_NOT_FRESH' }, { status: 403 }))
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('For your safety, sign in again before you unlink Google.')
    expect(within(alert).getByRole('link', { name: 'Sign in again' })).toHaveAttribute(
      'href',
      '/login?next=%2Fsettings%2Fsecurity'
    )
    expect(onUnlinked).not.toHaveBeenCalled()
  })

  it('says what else went wrong, and lets the user try again', async () => {
    renderUnlink(vi.fn<Fetch>(async () => Response.json({}, { status: 429 })))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
    expect(screen.getByRole('button', { name: 'Unlink Google' })).toBeEnabled()
  })
})
