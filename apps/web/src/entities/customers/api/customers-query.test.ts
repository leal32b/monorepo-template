import { createApiClient } from '#shared/api'
import { customersQuery } from './customers-query'

describe('customersQuery', () => {
  it('reads the page asked for, keyed by the organization and the page', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json({ items: [], total: 0, page: 3, pageSize: 25 }))
    const customers = customersQuery(createApiClient({ fetch }))

    expect(await customers('org-1', 'active', 'ada', 3)).toMatchObject({ page: 3 })
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org-1/customers?status=active&page=3&search=ada')
    expect(customers.keyFor('org-1', 'active', 'ada', 3)).not.toBe(customers.keyFor('org-1', 'active', 'ada', 4))
  })
})
