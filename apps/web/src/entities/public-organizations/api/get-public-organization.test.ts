import { createApiClient } from '#shared/api'
import { getPublicOrganization, publicOrganizationQuery } from './get-public-organization'

const acme = { name: 'Acme Barbershop', slug: 'acme', timeZone: 'America/Sao_Paulo', currency: 'BRL' }

describe('getPublicOrganization', () => {
  it('asks the public surface for the organization the address names, with no session', async () => {
    const fetch = vi.fn(async (_path: string, _init?: RequestInit) => Response.json(acme))

    expect(await getPublicOrganization(createApiClient({ fetch }), 'acme')).toEqual(acme)
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/public/organizations/acme')
  })

  it('keeps a slug that is not one inside its path segment', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json(acme))

    await getPublicOrganization(createApiClient({ fetch }), '../x?y')

    expect(fetch.mock.calls[0]?.[0]).toBe('/api/public/organizations/..%2Fx%3Fy')
  })

  it('fails with the API’s 404 for an organization that does not exist', async () => {
    const api = createApiClient({
      fetch: async () => Response.json({ code: 'organization_not_found' }, { status: 404 })
    })

    await expect(getPublicOrganization(api, 'nowhere')).rejects.toMatchObject({ kind: 'http', status: 404 })
  })
})

describe('publicOrganizationQuery', () => {
  it('is keyed by the slug, so two pages of one organization share one read', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json(acme))
    const read = publicOrganizationQuery(createApiClient({ fetch }))

    expect(await read('acme')).toEqual(acme)
    expect(read.keyFor('acme')).not.toBe(read.keyFor('other'))
  })
})
