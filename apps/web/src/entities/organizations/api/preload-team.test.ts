import { createAuthClient } from '#shared/api'
import { preloadTeam } from './preload-team'

describe('preloadTeam (ADR 0038)', () => {
  const asked: string[] = []
  const auth = createAuthClient({
    fetch: async (input) => {
      const url = new URL(String(input), 'http://localhost')
      asked.push(`${url.pathname}${url.search}`)
      if (url.pathname.endsWith('/organization/list-members')) return Response.json({ members: [], total: 0 })
      if (url.pathname.endsWith('/organization/list'))
        return Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' }])
      return Response.json([])
    }
  })
  beforeEach(() => {
    asked.length = 0
  })

  it('asks for the members, the roles and the pending invitations of the organization the address names', async () => {
    await preloadTeam(auth, 'acme')

    expect(asked).toEqual(
      expect.arrayContaining([
        '/api/auth/organization/list-members?organizationId=org-1',
        '/api/auth/organization/list-roles?organizationId=org-1',
        '/api/auth/organization/list-invitations?organizationId=org-1'
      ])
    )
  })

  it('asks for nothing more when the address names none of the user’s organizations', async () => {
    await preloadTeam(auth, 'globex')

    expect(asked).toEqual(['/api/auth/organization/list'])
  })
})
