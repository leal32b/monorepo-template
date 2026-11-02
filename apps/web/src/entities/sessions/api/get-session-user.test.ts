import { ApiError, createAuthClient } from '#shared/api'
import { getSessionUser } from './get-session-user'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: true, locale: 'en' }

describe('getSessionUser', () => {
  it('reads who is signed in from Better Auth, without refreshing the session, keeping only what the app uses', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ session: { id: 's1' }, user: ada }))

    expect(await getSessionUser(createAuthClient({ fetch }))).toEqual({
      id: 'u1',
      email: 'ada@example.com',
      name: 'Ada Lovelace'
    })
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/get-session?disableRefresh=true`)
  })

  it('takes a visitor for what it is, a 401, without a failed request: Better Auth answers 200 with nothing', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json(null) })

    await expect(getSessionUser(auth)).rejects.toMatchObject({ kind: 'http', status: 401 })
    await expect(getSessionUser(auth)).rejects.toBeInstanceOf(ApiError)
  })

  it('fails with the status when Better Auth answers an error', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json({ code: 'BOOM' }, { status: 500 }) })

    await expect(getSessionUser(auth)).rejects.toMatchObject({ kind: 'http', status: 500 })
  })

  it('fails as a network error when the API cannot be reached', async () => {
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(getSessionUser(auth)).rejects.toMatchObject({ kind: 'network' })
  })
})
