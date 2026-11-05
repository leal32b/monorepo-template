import { createAuthClient } from '#shared/api'
import { listOrganizations } from './list-organizations'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = {
  id: 'org-1',
  name: 'Acme',
  slug: 'acme',
  logo: null,
  createdAt: '2026-11-04T12:00:00.000Z',
  metadata: null
}

describe('listOrganizations', () => {
  it('reads the user’s organizations from Better Auth, keeping only what the app uses', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json([acme]))

    expect(await listOrganizations(createAuthClient({ fetch }))).toEqual([{ id: 'org-1', name: 'Acme', slug: 'acme' }])
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/list`)
  })

  it('fails with the status when Better Auth answers an error', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json({ code: 'BOOM' }, { status: 500 }) })

    await expect(listOrganizations(auth)).rejects.toMatchObject({ kind: 'http', status: 500 })
  })

  it('fails as a network error when the API cannot be reached', async () => {
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(listOrganizations(auth)).rejects.toMatchObject({ kind: 'network' })
  })
})
