import { render, screen } from '@solidjs/testing-library'
import { createApiClient } from '#shared/api'
import { App } from './app'

describe('App', () => {
  it('serves the home page at the root route with the given API client', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z' }
    const client = createApiClient({ fetch: async () => Response.json(health) })

    render(() => <App client={client} />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(await screen.findByText(/API is up/)).toBeInTheDocument()
  })
})
