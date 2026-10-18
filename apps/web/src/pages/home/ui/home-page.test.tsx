import { render, screen } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('shows the product heading and the API status', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z' }
    const client = createApiClient({ fetch: async () => Response.json(health) })

    render(() => (
      <ApiProvider client={client}>
        <HomePage />
      </ApiProvider>
    ))

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(await screen.findByText(/API is up/)).toBeInTheDocument()
  })
})
