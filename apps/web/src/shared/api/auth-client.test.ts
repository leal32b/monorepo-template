import { createAuthClient } from './auth-client'

/** A fetch that answers `body` and keeps what it was asked. */
function fakeFetch(body: unknown, init: ResponseInit = {}) {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json(body, init))
}

const urlOf = (fetch: ReturnType<typeof fakeFetch>) => String(fetch.mock.calls[0]?.[0])

describe('createAuthClient', () => {
  it('calls Better Auth on this origin, under /api/auth, with the fetch it is given', async () => {
    const fetch = fakeFetch({ token: null, user: { email: 'ada@example.com' } })
    const auth = createAuthClient({ fetch })

    await auth.signIn.email({ email: 'ada@example.com', password: 'correct horse battery staple' })

    expect(urlOf(fetch)).toBe(`${window.location.origin}/api/auth/sign-in/email`)
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST')
  })

  it("returns Better Auth's error code, so a screen can say what went wrong", async () => {
    const fetch = fakeFetch({ code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' }, { status: 403 })
    const auth = createAuthClient({ fetch })

    const { error } = await auth.signIn.email({ email: 'ada@example.com', password: 'correct horse battery staple' })

    expect(error).toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' })
  })

  it('speaks the two-factor plugin, for the second step of a sign-in', async () => {
    const fetch = fakeFetch({ token: 'session' })
    const auth = createAuthClient({ fetch })

    await auth.twoFactor.verifyTotp({ code: '123456' })

    expect(urlOf(fetch)).toBe(`${window.location.origin}/api/auth/two-factor/verify-totp`)
  })
})
