import { createAuthClient } from '#shared/api'
import { listInvitations } from './list-invitations'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const now = new Date('2026-11-04T12:00:00.000Z')

const invitation = (id: string, expiresAt: string) => ({
  id,
  email: 'ada@example.com',
  role: 'member',
  status: 'pending',
  organizationId: `org-${id}`,
  organizationName: `Org ${id}`,
  inviterId: 'u2',
  createdAt: '2026-11-01T12:00:00.000Z',
  expiresAt
})

describe('listInvitations', () => {
  it('reads the user’s pending invitations, keeping only what the app uses', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json([invitation('1', '2026-11-08T12:00:00.000Z')]))

    expect(await listInvitations(createAuthClient({ fetch }), now)).toEqual([
      { id: '1', organizationName: 'Org 1', expiresAt: new Date('2026-11-08T12:00:00.000Z') }
    ])
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      `${window.location.origin}/api/auth/organization/list-user-invitations`
    )
  })

  it('leaves out the ones that have expired, which Better Auth still lists as pending', async () => {
    const auth = createAuthClient({
      fetch: async () =>
        Response.json([
          invitation('old', '2026-11-04T11:59:59.000Z'),
          invitation('now', '2026-11-04T12:00:00.000Z'),
          invitation('new', '2026-11-04T12:00:01.000Z')
        ])
    })

    const open = await listInvitations(auth, now)

    expect(open.map(({ id }) => id)).toEqual(['new'])
  })

  it('fails with the status when Better Auth answers an error', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json({ code: 'BOOM' }, { status: 500 }) })

    await expect(listInvitations(auth, now)).rejects.toMatchObject({ kind: 'http', status: 500 })
  })

  it('fails as a network error when the API cannot be reached', async () => {
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(listInvitations(auth, now)).rejects.toMatchObject({ kind: 'network' })
  })
})
