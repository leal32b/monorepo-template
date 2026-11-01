import { MemoryRouter, Route, useNavigate } from '@solidjs/router'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { onMount } from 'solid-js'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ForgotPasswordPage } from './forgot-password-page'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

/** The page, navigated to with what the sign-in carried over in the history's state, if anything. */
function renderPage(state?: unknown) {
  const From = () => {
    const navigate = useNavigate()
    onMount(() => navigate('/forgot-password', { state }))
    return null
  }
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
        <AuthProvider client={createAuthClient({ fetch: async () => Response.json({ status: true }) })}>
          <MemoryRouter>
            <Route path="/" component={From} />
            <Route path="/forgot-password" component={ForgotPasswordPage} />
          </MemoryRouter>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
}

describe('ForgotPasswordPage', () => {
  it('opens on the form that asks for the link, with a way back to sign in', async () => {
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Reset your password' })

    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send link' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('')
  })

  it('fills in the email the sign-in carried over, so it is not typed twice', async () => {
    renderPage({ email: 'ada@example.com' })

    expect(await screen.findByRole('textbox', { name: 'Email' })).toHaveValue('ada@example.com')
  })

  it('offers to open the inbox once the link is on its way, for a Gmail address', async () => {
    renderPage({ email: 'ada@gmail.com' })
    fireEvent.click(await screen.findByRole('button', { name: 'Send link' }))

    expect(await screen.findByRole('link', { name: /^Open Gmail/ })).toHaveAttribute('href', 'https://mail.google.com/')
  })

  it('offers no inbox for an address it does not know', async () => {
    renderPage({ email: 'ada@example.com' })
    fireEvent.click(await screen.findByRole('button', { name: 'Send link' }))
    await screen.findByRole('status')

    expect(screen.queryByRole('link', { name: /^Open / })).not.toBeInTheDocument()
  })
})
