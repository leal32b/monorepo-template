import { render, screen } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('shows the translated heading and the API status', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z' }
    const client = createApiClient({ fetch: async () => Response.json(health) })

    render(() => (
      <I18nProvider locale="pt-BR">
        <ApiProvider client={client}>
          <HomePage />
        </ApiProvider>
      </I18nProvider>
    ))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Template de monorepo')
    expect(await screen.findByText(/A API está no ar/)).toBeInTheDocument()
  })
})
