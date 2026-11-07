import { healthResponseSchema } from '@repo/contracts'
import { ApiError, createApiClient, noContent } from './client'

const health = { status: 'ok', service: 'api', release: 'dev', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('expected the request to fail')
}

describe('createApiClient', () => {
  it('returns the response body once it satisfies the schema', async () => {
    const client = createApiClient({ fetch: async () => json(health) })

    expect(await client.get('/api/health', healthResponseSchema)).toEqual(health)
  })

  it('requests the base URL plus the path, asking for JSON', async () => {
    const fetchMock = vi.fn(async () => json(health))
    const client = createApiClient({ fetch: fetchMock, baseUrl: 'https://api.example.com' })

    await client.get('/api/health', healthResponseSchema)

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/health', {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
  })

  it('uses a same-origin path when no base URL is given', async () => {
    const fetchMock = vi.fn(async () => json(health))
    const client = createApiClient({ fetch: fetchMock })

    await client.get('/api/health', healthResponseSchema)

    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.anything())
  })

  it('fails with kind "network" when the request cannot be made', async () => {
    const client = createApiClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    const error = await failureOf(client.get('/api/health', healthResponseSchema))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe('network')
  })

  it('fails with kind "http" and the problem when the API answers with an error', async () => {
    const problem = { type: 'urn:problem:not_found', title: 'Not Found', status: 404, code: 'not_found' }
    const client = createApiClient({ fetch: async () => json(problem, 404) })

    const error = await failureOf(client.get('/api/nope', healthResponseSchema))

    expect(error.kind).toBe('http')
    expect(error.status).toBe(404)
    expect(error.problem).toEqual(problem)
  })

  it('fails with kind "http" and no problem when the error body is not a problem', async () => {
    const client = createApiClient({
      fetch: async () => new Response('<html>Bad gateway</html>', { status: 502 })
    })

    const error = await failureOf(client.get('/api/health', healthResponseSchema))

    expect(error.kind).toBe('http')
    expect(error.status).toBe(502)
    expect(error.problem).toBeUndefined()
  })

  it('fails with kind "contract" when a successful body does not satisfy the schema', async () => {
    const client = createApiClient({ fetch: async () => json({ status: 'down' }) })

    const error = await failureOf(client.get('/api/health', healthResponseSchema))

    expect(error.kind).toBe('contract')
    expect(error.status).toBe(200)
  })

  it('fails with kind "contract" when a successful body is not JSON', async () => {
    const client = createApiClient({ fetch: async () => new Response('not json', { status: 200 }) })

    const error = await failureOf(client.get('/api/health', healthResponseSchema))

    expect(error.kind).toBe('contract')
  })

  it('returns the body of an accepted error status once it satisfies the schema', async () => {
    const degraded = { ...health, status: 'degraded', database: 'down' }
    const client = createApiClient({ fetch: async () => json(degraded, 503) })

    expect(await client.get('/api/health', healthResponseSchema, { accept: [503] })).toEqual(degraded)
  })

  it('fails with kind "contract" when an accepted error status does not satisfy the schema', async () => {
    const client = createApiClient({ fetch: async () => new Response('Service Unavailable', { status: 503 }) })

    const error = await failureOf(client.get('/api/health', healthResponseSchema, { accept: [503] }))

    expect(error.kind).toBe('contract')
    expect(error.status).toBe(503)
  })

  describe('send', () => {
    it('sends a JSON body with the method, and returns the answer once it satisfies the schema', async () => {
      const fetchMock = vi.fn(async () => json(health, 201))
      const client = createApiClient({ fetch: fetchMock })

      expect(await client.send('POST', '/api/things', { name: 'Ada' }, healthResponseSchema)).toEqual(health)
      expect(fetchMock).toHaveBeenCalledWith('/api/things', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: '{"name":"Ada"}'
      })
    })

    it('sends no body and no content type when there is none', async () => {
      const fetchMock = vi.fn(async () => json(health))
      const client = createApiClient({ fetch: fetchMock })

      await client.send('POST', '/api/things/1/archive', undefined, healthResponseSchema)

      expect(fetchMock).toHaveBeenCalledWith('/api/things/1/archive', {
        method: 'POST',
        headers: { Accept: 'application/json' }
      })
    })

    it('takes an answer with no content as nothing', async () => {
      const client = createApiClient({ fetch: async () => new Response(null, { status: 204 }) })

      expect(await client.send('DELETE', '/api/things/1', undefined, noContent)).toBeUndefined()
    })

    it('fails like get does: network, http with the problem, contract', async () => {
      const problem = { type: 'urn:problem:conflict', title: 'Conflict', status: 409, code: 'customer_email_taken' }

      const network = createApiClient({
        fetch: async () => {
          throw new TypeError('Failed to fetch')
        }
      })
      const http = createApiClient({ fetch: async () => json(problem, 409) })
      const contract = createApiClient({ fetch: async () => json({ nope: true }) })

      expect((await failureOf(network.send('PUT', '/x', {}, healthResponseSchema))).kind).toBe('network')
      const refused = await failureOf(http.send('PUT', '/x', {}, healthResponseSchema))
      expect(refused).toMatchObject({ kind: 'http', status: 409 })
      expect(refused.problem?.code).toBe('customer_email_taken')
      expect((await failureOf(contract.send('PUT', '/x', {}, healthResponseSchema))).kind).toBe('contract')
    })
  })
})
