import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { TwoFactorPage } from './two-factor-page'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** The challenge at `path`, in a router that has somewhere else to go. */
function renderPage(path: string, fetch: Fetch = async () => Response.json({ token: 'session', user: { id: 'u1' } })) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
        <AuthProvider client={createAuthClient({ fetch })}>
          <MemoryRouter history={history}>
            <Route path="/login/two-factor" component={TwoFactorPage} />
            <Route path="*" component={() => <p>Somewhere else</p>} />
          </MemoryRouter>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return history
}

describe('TwoFactorPage', () => {
  it('opens on the code form, under its own title', () => {
    renderPage('/login/two-factor')

    expect(screen.getByRole('heading', { level: 1, name: 'Two-step verification' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '6-digit code' })).toBeInTheDocument()
  })

  it('after the code, goes where the user was headed, and Back does not return to the form', async () => {
    const history = renderPage('/login/two-factor?next=%2Fprojects')

    fireEvent.input(screen.getByRole('textbox', { name: '6-digit code' }), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(history.get()).toBe('/projects'))
    history.back()
    expect(history.get()).toBe('/')
  })

  it('offers a backup code when the app is out of reach, and the app again', () => {
    renderPage('/login/two-factor')

    fireEvent.click(screen.getByRole('button', { name: 'Use a backup code' }))
    expect(screen.getByRole('textbox', { name: 'Backup code' })).toBeInTheDocument()
    expect(screen.getByText('Use one of the codes you saved.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Use the code from the app' }))
    expect(screen.getByRole('textbox', { name: '6-digit code' })).toBeInTheDocument()
  })

  it('points the way to sign in again to where the user was headed', async () => {
    renderPage('/login/two-factor?next=%2Fprojects', async () =>
      Response.json({ code: 'INVALID_TWO_FACTOR_COOKIE' }, { status: 401 })
    )

    fireEvent.input(screen.getByRole('textbox', { name: '6-digit code' }), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('link', { name: 'Sign in again' })).toHaveAttribute(
      'href',
      '/login?next=%2Fprojects'
    )
  })
})
