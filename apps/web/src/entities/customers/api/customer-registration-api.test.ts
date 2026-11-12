import { createApiClient } from '#shared/api'
import { registerAsCustomer } from './customer-registration-api'

describe('registerAsCustomer', () => {
  it('posts what the visitor typed to the public surface of the organization, and takes its 202', async () => {
    const fetch = vi.fn(async (_path: string, _init?: RequestInit) =>
      Response.json({ received: true }, { status: 202 })
    )
    const input = { name: 'Carla', email: 'carla@example.com', referralCode: '' }

    expect(await registerAsCustomer(createApiClient({ fetch }), 'acme', input)).toEqual({ received: true })
    const [path, init] = fetch.mock.calls[0] ?? []
    expect(path).toBe('/api/public/organizations/acme/customer-registrations')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(input)
  })

  it('fails with the API’s 429 and the seconds to wait', async () => {
    const api = createApiClient({
      fetch: async () =>
        Response.json(
          { type: 'urn:problem:rate_limited', title: 'Too many', status: 429, code: 'rate_limited', retryAfter: 45 },
          { status: 429 }
        )
    })

    await expect(registerAsCustomer(api, 'acme', { name: 'Carla', phone: '1' })).rejects.toMatchObject({
      status: 429,
      problem: { retryAfter: 45 }
    })
  })
})
