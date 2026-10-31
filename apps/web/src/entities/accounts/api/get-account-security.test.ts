import { ApiError, createAuthClient } from '#shared/api'
import { getAccountSecurity } from './get-account-security'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth answering the list of accounts and the session, as the user in `user` has them. */
function betterAuth(accounts: { id: string; providerId: string }[], user: { twoFactorEnabled: boolean | null }) {
  return vi.fn<Fetch>(async (input) =>
    String(input).includes('/list-accounts')
      ? Response.json(accounts)
      : Response.json({ session: { id: 's1' }, user: { id: 'u1', email: 'ada@example.com', ...user } })
  )
}

describe('getAccountSecurity', () => {
  it('reads how the user signs in and whether signing in asks for a second step', async () => {
    const fetch = betterAuth(
      [
        { id: 'a1', providerId: 'credential' },
        { id: 'a2', providerId: 'google' }
      ],
      { twoFactorEnabled: true }
    )

    expect(await getAccountSecurity(createAuthClient({ fetch }))).toEqual({
      email: 'ada@example.com',
      password: true,
      googleAccountId: 'a2',
      twoFactor: true
    })
    expect(fetch.mock.calls.map(([input]) => String(input))).toContain(
      `${window.location.origin}/api/auth/get-session?disableRefresh=true`
    )
  })

  it('reads an account made with Google alone: no password, and no second step', async () => {
    const fetch = betterAuth([{ id: 'a2', providerId: 'google' }], { twoFactorEnabled: null })

    expect(await getAccountSecurity(createAuthClient({ fetch }))).toEqual({
      email: 'ada@example.com',
      password: false,
      googleAccountId: 'a2',
      twoFactor: false
    })
  })

  it('fails with the status Better Auth answered, such as 401 when the session ended', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ code: 'UNAUTHORIZED' }, { status: 401 }))

    const failure = await getAccountSecurity(createAuthClient({ fetch })).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 401 })
  })

  it('reads no session as one that ended, with 401', async () => {
    const fetch = vi.fn<Fetch>(async (input) =>
      String(input).includes('/list-accounts') ? Response.json([]) : Response.json(null)
    )

    await expect(getAccountSecurity(createAuthClient({ fetch }))).rejects.toMatchObject({ status: 401 })
  })
})
