import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider, ThemeProvider } from '#shared/config'
import { ProfilePage } from './profile-page'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

describe('ProfilePage', () => {
  it('shows the name and the email of who is signed in', () => {
    render(() => (
      <I18nProvider locale="en">
        <ThemeProvider>
          <PaletteProvider>
            <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
              <AuthProvider client={createAuthClient({ fetch: async () => Response.json(null) })}>
                <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                  <MemoryRouter>
                    <Route path="/" component={ProfilePage} />
                  </MemoryRouter>
                </SessionProvider>
              </AuthProvider>
            </ApiProvider>
          </PaletteProvider>
        </ThemeProvider>
      </I18nProvider>
    ))

    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    const details = within(screen.getByRole('region', { name: 'Your details' }))
    expect(details.getByText('Name').parentElement?.parentElement).toHaveTextContent('Ada Lovelace')
    expect(details.getByText('Email').parentElement?.parentElement).toHaveTextContent('ada@example.com')
  })
})
