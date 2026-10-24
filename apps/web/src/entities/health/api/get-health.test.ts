import { createApiClient } from '#shared/api'
import { getHealth } from './get-health'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z' }

describe('getHealth', () => {
  it('asks the API for /api/health and returns the validated answer', async () => {
    const fetchMock = vi.fn(async () => Response.json(health))
    const client = createApiClient({ fetch: fetchMock })

    expect(await getHealth(client)).toEqual(health)
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.anything())
  })
})
