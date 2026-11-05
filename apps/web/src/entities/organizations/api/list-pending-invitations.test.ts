import { createAuthClient } from '#shared/api'
import { listPendingInvitations } from './list-pending-invitations'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const now = new Date('2026-11-04T12:00:00.000Z')
const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  organizationId: 'org-1',
  email: `${id}@example.com`,
  role: 'member',
  status: 'pending',
  expiresAt: '2026-11-11T12:00:00.000Z',
  ...overrides
})

describe('listPendingInvitations', () => {
  it('keeps the invitations still waiting and within their week, with the roles they offer', async () => {
    const fetch = vi.fn<Fetch>(async () =>
      Response.json([
        row('a', { role: 'member,editor' }),
        row('b', { status: 'accepted' }),
        row('c', { status: 'canceled' }),
        row('d', { expiresAt: '2026-11-03T12:00:00.000Z' }),
        row('e', { role: null })
      ])
    )

    expect(await listPendingInvitations(createAuthClient({ fetch }), 'org-1', now)).toEqual([
      { id: 'a', email: 'a@example.com', roles: ['member', 'editor'], expiresAt: new Date('2026-11-11T12:00:00.000Z') },
      { id: 'e', email: 'e@example.com', roles: [], expiresAt: new Date('2026-11-11T12:00:00.000Z') }
    ])
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      `${window.location.origin}/api/auth/organization/list-invitations?organizationId=org-1`
    )
  })

  it('fails with the status when Better Auth answers an error', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json({ code: 'BOOM' }, { status: 403 }) })

    await expect(listPendingInvitations(auth, 'org-1', now)).rejects.toMatchObject({ kind: 'http', status: 403 })
  })

  it('fails as a network error when the API cannot be reached', async () => {
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(listPendingInvitations(auth, 'org-1', now)).rejects.toMatchObject({ kind: 'network' })
  })
})
