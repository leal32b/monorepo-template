import { MemoryRouter, Route, useNavigate } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { onMount } from 'solid-js'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ForgotPasswordPage } from './forgot-password-page'

/** The page, navigated to with what the sign-in carried over in the history's state, if anything. */
function renderPage(state?: unknown) {
  const From = () => {
    const navigate = useNavigate()
    onMount(() => navigate('/forgot-password', { state }))
    return null
  }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch: async () => Response.json({ status: true }) })}>
        <MemoryRouter>
          <Route path="/" component={From} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
        </MemoryRouter>
      </AuthProvider>
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
})
