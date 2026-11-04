import { createApiClient } from '#shared/api'
import { getMembership } from './get-membership'

describe('getMembership', () => {
  it('asks the tenant guard of the organization for the caller’s roles and permissions', async () => {
    const membership = { roles: ['admin'], permissions: { member: ['create'] } }
    const fetch = vi.fn(async (_path: string) => Response.json(membership))

    expect(await getMembership(createApiClient({ fetch }), 'org/1')).toEqual(membership)
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org%2F1/me')
  })

  it('fails with the API’s 404 for an organization the caller is not in', async () => {
    const api = createApiClient({
      fetch: async () => Response.json({ code: 'organization_not_found' }, { status: 404 })
    })

    await expect(getMembership(api, 'org-2')).rejects.toMatchObject({ kind: 'http', status: 404 })
  })
})
