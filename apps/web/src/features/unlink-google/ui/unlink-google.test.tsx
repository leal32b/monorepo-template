import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import type { AuthFailure } from '#shared/api'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { UnlinkGoogle, UnlinkGoogleFailure } from './unlink-google'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function renderUnlink(fetch = vi.fn<Fetch>(async () => Response.json({ status: true }))) {
  const onUnlinked = vi.fn()
  const onFailure = vi.fn<(failure: AuthFailure) => void>()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <MemoryRouter>
          <Route
            path="/"
            component={() => <UnlinkGoogle accountId="a1" onUnlinked={onUnlinked} onFailure={onFailure} />}
          />
        </MemoryRouter>
      </AuthProvider>
    </I18nProvider>
  ))
  fireEvent.click(screen.getByRole('button', { name: 'Unlink Google' }))
  return { fetch, onUnlinked, onFailure }
}

describe('UnlinkGoogle', () => {
  it('unlinks the Google account', async () => {
    const { fetch, onUnlinked } = renderUnlink()

    await waitFor(() => expect(onUnlinked).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/unlink-account`)
    expect(JSON.parse(String(init?.body))).toEqual({ accountId: 'a1' })
  })

  it('reports what went wrong, and lets the user try again', async () => {
    const { onUnlinked, onFailure } = renderUnlink(
      vi.fn<Fetch>(async () => Response.json({ code: 'SESSION_NOT_FRESH' }, { status: 403 }))
    )

    await waitFor(() => expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ code: 'SESSION_NOT_FRESH' })))
    expect(onUnlinked).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Unlink Google' })).toBeEnabled()
  })
})

function renderFailure(failure: AuthFailure) {
  render(() => (
    <I18nProvider locale="en">
      <MemoryRouter>
        <Route path="/" component={() => <UnlinkGoogleFailure failure={failure} />} />
      </MemoryRouter>
    </I18nProvider>
  ))
}

describe('UnlinkGoogleFailure', () => {
  it('asks to sign in again when the session is too old for it', () => {
    renderFailure({ code: 'SESSION_NOT_FRESH', status: 403, requestId: undefined })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('For your safety, sign in again before you unlink Google.')
    expect(within(alert).getByRole('link', { name: 'Sign in again' })).toHaveAttribute(
      'href',
      '/login?next=%2Fsettings%2Fsecurity'
    )
  })

  it('says anything else in the usual words', () => {
    renderFailure({ code: undefined, status: 429, requestId: undefined })

    expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts.')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
