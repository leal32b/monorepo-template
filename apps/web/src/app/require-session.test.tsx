import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import * as z from 'zod/mini'
import { useSession } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient, useApi } from '#shared/api'
import { I18nProvider, PaletteProvider } from '#shared/config'
import { RequireSession } from './require-session'

/** The API client calls with a path; Better Auth's client with a URL. */
type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>
type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }

/** A page behind the guard that asks the API for something when its button is pressed. */
function ReportsPage() {
  const api = useApi()
  return (
    <button type="button" onClick={() => api.get('/api/reports', z.object({})).catch(() => undefined)}>
      Load
    </button>
  )
}

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

/** Better Auth's answer to `get-session` for the signed-in user: the session and the user. */
const signedIn = () => Response.json({ session: { id: 's1' }, user: { ...ada, twoFactorEnabled: false, locale: 'en' } })

/** Better Auth's answer for a visitor: 200, with nothing in it, so the browser logs no error. */
const visitor = () => Response.json(null)

/**
 * A page behind the guard at `path`: Better Auth answers who is signed in through `auth`, and the
 * API answers the pages' own calls (and how the service is) through `api`.
 */
function renderAt(path: string, auth: AuthFetch, api: ApiFetch = async () => Response.json(health)) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <PaletteProvider>
        <ApiProvider client={createApiClient({ fetch: api })}>
          <AuthProvider client={createAuthClient({ fetch: auth })}>
            <MemoryRouter history={history}>
              <Route path="/" component={RequireSession}>
                <Route path="/projects" component={() => <p>Hello, {useSession().name}</p>} />
                <Route path="/reports" component={ReportsPage} />
              </Route>
              <Route path="/login" component={() => <p>The sign-in</p>} />
            </MemoryRouter>
          </AuthProvider>
        </ApiProvider>
      </PaletteProvider>
    </I18nProvider>
  ))
  return history
}

describe('RequireSession', () => {
  it('shows the page when there is a session, and tells it who is signed in', async () => {
    renderAt('/projects', async () => signedIn())

    expect(await screen.findByText('Hello, Ada Lovelace')).toBeInTheDocument()
  })

  it('asks Better Auth, not the API, who is signed in, and does not refresh the session', async () => {
    const auth = vi.fn<AuthFetch>(async () => signedIn())
    const api = vi.fn<ApiFetch>(async () => Response.json(health))
    renderAt('/projects', auth, api)
    await screen.findByText('Hello, Ada Lovelace')

    expect(String(auth.mock.calls[0]?.[0])).toContain('/api/auth/get-session?disableRefresh=true')
    expect(api.mock.calls.map(([path]) => path)).not.toContain('/api/me')
  })

  it('draws the frame of the shell while a slow session check goes on, not a blank page', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    renderAt('/projects', () => new Promise<Response>(() => {}))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    vi.advanceTimersByTime(300)

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    vi.useRealTimers()
  })

  it('sends a visitor without a session to sign in, to come back to the same page', async () => {
    const history = renderAt('/projects?tab=1', async () => visitor())

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Fprojects%3Ftab%3D1'))
  })

  it('says when the session cannot be checked, and checks again on request', async () => {
    const auth = vi
      .fn<AuthFetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(signedIn())
    renderAt('/projects', auth)

    expect(await screen.findByRole('heading', { level: 1, name: 'We could not check your sign-in' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Hello, Ada Lovelace')).toBeInTheDocument()
  })

  it('sends the user to sign in when the session ends while a page is open, to come back to it', async () => {
    const history = renderAt(
      '/reports?year=2026',
      async () => signedIn(),
      async (path) =>
        path === '/api/health' ? Response.json(health) : Response.json({ code: 'unauthenticated' }, { status: 401 })
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Load' }))

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Freports%3Fyear%3D2026'))
  })

  it('passes on to the sign-in the error a confirmation link came back with, apart from the page', async () => {
    const history = renderAt('/projects?error=TOKEN_EXPIRED', async () => visitor())

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Fprojects&error=TOKEN_EXPIRED'))
  })
})
