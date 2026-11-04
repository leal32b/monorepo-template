import { builtInRoles } from '@repo/contracts'
import { createAuthClient } from '#shared/api'
import { listRoles } from './list-roles'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

describe('listRoles', () => {
  it('lists the three built-in roles, then the organization’s own with what they grant', async () => {
    const fetch = vi.fn<Fetch>(async () =>
      Response.json([
        { id: 'r1', organizationId: 'org-1', role: 'editor', permission: { invitation: ['create'] } },
        // What is not a valid set of permissions grants nothing, as in the API.
        { id: 'r2', organizationId: 'org-1', role: 'odd', permission: { project: ['read'] } }
      ])
    )

    expect(await listRoles(createAuthClient({ fetch }), 'org-1')).toEqual([
      { name: 'owner', permissions: builtInRoles.owner, builtIn: true },
      { name: 'admin', permissions: builtInRoles.admin, builtIn: true },
      { name: 'member', permissions: builtInRoles.member, builtIn: true },
      { name: 'editor', permissions: { invitation: ['create'] }, builtIn: false },
      { name: 'odd', permissions: {}, builtIn: false }
    ])
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      `${window.location.origin}/api/auth/organization/list-roles?organizationId=org-1`
    )
  })

  it('fails with the status when Better Auth answers an error', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json({ code: 'BOOM' }, { status: 403 }) })

    await expect(listRoles(auth, 'org-1')).rejects.toMatchObject({ kind: 'http', status: 403 })
  })

  it('fails as a network error when the API cannot be reached', async () => {
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(listRoles(auth, 'org-1')).rejects.toMatchObject({ kind: 'network' })
  })
})
