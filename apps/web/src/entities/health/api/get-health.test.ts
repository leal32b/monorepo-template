import { createApiClient } from '#shared/api'
import { getHealth } from './get-health'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

describe('getHealth', () => {
  it('asks the API for /api/health and returns the validated answer', async () => {
    const fetchMock = vi.fn(async () => Response.json(health))
    const client = createApiClient({ fetch: fetchMock })

    expect(await getHealth(client)).toEqual(health)
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.anything())
  })

  it('returns the degraded answer the API gives with 503', async () => {
    const degraded = { ...health, status: 'degraded', database: 'down' }
    const client = createApiClient({ fetch: async () => Response.json(degraded, { status: 503 }) })

    expect(await getHealth(client)).toEqual(degraded)
  })
})
