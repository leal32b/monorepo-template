import { createAuthClient } from '#shared/api'
import { listMembers } from './list-members'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const row = (id: string, role: string, name: string) => ({
  id,
  organizationId: 'org-1',
  userId: `u-${id}`,
  role,
  createdAt: '2026-11-04T12:00:00.000Z',
  user: { id: `u-${id}`, name, email: `${id}@example.com`, image: null }
})

describe('listMembers', () => {
  it('reads the members of the organization, with their roles split and their dates parsed', async () => {
    const fetch = vi.fn<Fetch>(async () =>
      Response.json({ members: [row('m1', 'owner', 'Ada'), row('m2', 'member,editor', 'Grace')], total: 2 })
    )

    expect(await listMembers(createAuthClient({ fetch }), 'org-1')).toEqual([
      {
        id: 'm1',
        userId: 'u-m1',
        name: 'Ada',
        email: 'm1@example.com',
        roles: ['owner'],
        createdAt: new Date('2026-11-04T12:00:00.000Z')
      },
      {
        id: 'm2',
        userId: 'u-m2',
        name: 'Grace',
        email: 'm2@example.com',
        roles: ['member', 'editor'],
        createdAt: new Date('2026-11-04T12:00:00.000Z')
      }
    ])
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      `${window.location.origin}/api/auth/organization/list-members?organizationId=org-1`
    )
  })

  it('fails with the status when Better Auth answers an error', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json({ code: 'BOOM' }, { status: 403 }) })

    await expect(listMembers(auth, 'org-1')).rejects.toMatchObject({ kind: 'http', status: 403 })
  })

  it('fails as a network error when the API cannot be reached', async () => {
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(listMembers(auth, 'org-1')).rejects.toMatchObject({ kind: 'network' })
  })
})
