import { createAuthClient } from './auth-client'
import { callAuth } from './call-auth'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** A sign-up through the real client, answered by `fetch`. */
function signUpWith(fetch: Fetch) {
  const auth = createAuthClient({ fetch })
  const body = { name: 'Ada', email: 'ada@example.com', password: 'correct horse battery staple', locale: 'en' }
  return callAuth((options) => auth.signUp.email(body, options))
}

describe('callAuth', () => {
  it('returns nothing when the call succeeds', async () => {
    expect(await signUpWith(async () => Response.json({ token: null, user: { id: 'u1' } }))).toBeUndefined()
  })

  it("returns the status and Better Auth's code, with the request id the API logged it under", async () => {
    const fetch = async () =>
      Response.json({ code: 'PASSWORD_COMPROMISED' }, { status: 400, headers: { 'X-Request-Id': 'req-1' } })

    expect(await signUpWith(fetch)).toEqual({ status: 400, code: 'PASSWORD_COMPROMISED', requestId: 'req-1' })
  })

  it('returns the status alone when the answer says nothing more', async () => {
    const fetch = async () => new Response('<h1>Bad gateway</h1>', { status: 502 })

    expect(await signUpWith(fetch)).toEqual({ status: 502, code: undefined, requestId: undefined })
  })

  it('returns a failure without a status when the API cannot be reached', async () => {
    const fetch = async () => {
      throw new TypeError('Failed to fetch')
    }

    expect(await signUpWith(fetch)).toEqual({ status: undefined, code: undefined, requestId: undefined })
  })
})
