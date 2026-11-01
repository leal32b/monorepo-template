import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, within } from '@solidjs/testing-library'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ResetPasswordPage } from './reset-password-page'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

/** The page at `path`, as the link in the email lands on it. */
function renderPage(path: string) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
        <AuthProvider client={createAuthClient({ fetch: async () => Response.json({ status: true }) })}>
          <MemoryRouter history={history}>
            <Route path="/reset-password" component={ResetPasswordPage} />
          </MemoryRouter>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
}

describe('ResetPasswordPage', () => {
  it('opens on the form for a link with its token, saying it signs out everywhere else (T10)', () => {
    renderPage('/reset-password?token=t0k3n')

    expect(screen.getByRole('heading', { level: 1, name: 'Choose a new password' })).toBeInTheDocument()
    expect(screen.getByText('This signs you out everywhere else.')).toBeInTheDocument()
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
  })

  it('keeps a way back to sign in, for a change of mind', () => {
    renderPage('/reset-password?token=t0k3n')

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('says when the link came back expired or used, with the way to ask for a new one', () => {
    renderPage('/reset-password?error=INVALID_TOKEN')

    expect(screen.getByRole('heading', { level: 1, name: 'This link no longer works' })).toBeInTheDocument()
    expect(screen.queryByText('This signs you out everywhere else.')).not.toBeInTheDocument()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('This link has expired or was already used.')
    expect(within(alert).getByRole('link', { name: 'Ask for a new link' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  it('after the change, says so and offers to sign in with the new password', async () => {
    renderPage('/reset-password?token=t0k3n')

    fireEvent.input(screen.getByLabelText('New password'), { target: { value: 'correct horse battery staple' } })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Password changed' })).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})
