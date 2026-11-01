import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('shows, in the app frame, the translated heading', async () => {
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

    expect(screen.getByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Template de monorepo')
    expect(await screen.findByRole('button', { name: /Status do serviço: Tudo funcionando/ })).toBeInTheDocument()
  })
})
