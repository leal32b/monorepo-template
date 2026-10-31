import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ForgotPasswordPage } from './forgot-password-page'

describe('ForgotPasswordPage', () => {
  it('opens on the form that asks for the link, with a way back to sign in', () => {
    render(() => (
      <I18nProvider locale="en">
        <AuthProvider client={createAuthClient({ fetch: async () => Response.json({ status: true }) })}>
          <MemoryRouter>
            <Route path="*" component={ForgotPasswordPage} />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    ))

    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send link' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})
