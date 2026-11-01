import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import * as z from 'zod/mini'
import { useSession } from '#entities/sessions'
import { ApiProvider, createApiClient, useApi } from '#shared/api'
import { I18nProvider, PaletteProvider } from '#shared/config'
import { RequireSession } from './require-session'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

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

/** A page behind the guard at `path`, with the API answering `/api/me` through `fetch`. */
function renderAt(path: string, fetch: Fetch) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <PaletteProvider>
        <ApiProvider client={createApiClient({ fetch })}>
          <MemoryRouter history={history}>
            <Route path="/" component={RequireSession}>
              <Route path="/projects" component={() => <p>Hello, {useSession().name}</p>} />
              <Route path="/reports" component={ReportsPage} />
            </Route>
            <Route path="/login" component={() => <p>The sign-in</p>} />
          </MemoryRouter>
        </ApiProvider>
      </PaletteProvider>
    </I18nProvider>
  ))
  return history
}

describe('RequireSession', () => {
  it('shows the page when there is a session, and tells it who is signed in', async () => {
    renderAt('/projects', async () => Response.json(ada))

    expect(await screen.findByText('Hello, Ada Lovelace')).toBeInTheDocument()
  })

  it('draws the empty frame of the shell while a slow session check goes on, not a blank page', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderAt('/projects', () => new Promise<Response>(() => {}))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    vi.advanceTimersByTime(300)

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    vi.useRealTimers()
  })

  it('sends a visitor without a session to sign in, to come back to the same page', async () => {
    const history = renderAt('/projects?tab=1', async () => Response.json({ code: 'unauthenticated' }, { status: 401 }))

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Fprojects%3Ftab%3D1'))
  })

  it('says when the session cannot be checked, and checks again on request', async () => {
    const asked = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json(ada))
    // The entry frame asks how the service is, too; only the session is asked twice.
    const fetch: Fetch = (path, init) =>
      path === '/api/health'
        ? Promise.resolve(
            Response.json({ status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' })
          )
        : asked(path, init)
    renderAt('/projects', fetch)

    expect(await screen.findByRole('heading', { level: 1, name: 'We could not check your sign-in' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Hello, Ada Lovelace')).toBeInTheDocument()
  })

  it('sends the user to sign in when the session ends while a page is open, to come back to it', async () => {
    const history = renderAt('/reports?year=2026', async (path) =>
      path === '/api/me' ? Response.json(ada) : Response.json({ code: 'unauthenticated' }, { status: 401 })
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Load' }))

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Freports%3Fyear%3D2026'))
  })

  it('passes on to the sign-in the error a confirmation link came back with, apart from the page', async () => {
    const history = renderAt('/projects?error=TOKEN_EXPIRED', async () =>
      Response.json({ code: 'unauthenticated' }, { status: 401 })
    )

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Fprojects&error=TOKEN_EXPIRED'))
  })
})
