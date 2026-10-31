import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('shows, in the app frame, who is signed in, the translated heading and the API status', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
    const client = createApiClient({ fetch: async () => Response.json(health) })

    render(() => (
      <I18nProvider locale="pt-BR">
        <ApiProvider client={client}>
          <AuthProvider client={createAuthClient({ fetch: async () => Response.json(null) })}>
            <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
              <MemoryRouter>
                <Route path="*" component={HomePage} />
              </MemoryRouter>
            </SessionProvider>
          </AuthProvider>
        </ApiProvider>
      </I18nProvider>
    ))

    expect(screen.getByText('Entrou como Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Template de monorepo')
    expect(await screen.findByText(/A API está no ar/)).toBeInTheDocument()
  })
})
