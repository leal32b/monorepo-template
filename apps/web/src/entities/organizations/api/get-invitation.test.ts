import { createApiClient } from '#shared/api'
import { getInvitation } from './get-invitation'

const invitation = {
  id: 'inv/1',
  organizationName: 'Acme',
  organizationSlug: 'acme',
  inviterName: 'Grace Hopper',
  status: 'pending',
  expiresAt: '2026-11-11T12:00:00.000Z',
  member: false
}

describe('getInvitation', () => {
  it('asks the API what became of the invitation', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json(invitation))

    expect(await getInvitation(createApiClient({ fetch }), 'inv/1')).toEqual(invitation)
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/invitations/inv%2F1')
  })

  it('fails with the API’s 403 for an account the invitation was not sent to', async () => {
    const api = createApiClient({
      fetch: async () => Response.json({ code: 'not_the_recipient' }, { status: 403 })
    })

    await expect(getInvitation(api, 'inv-2')).rejects.toMatchObject({ kind: 'http', status: 403 })
  })
})
