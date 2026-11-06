import { ApiError, createAuthClient } from '#shared/api'
import { listSignInMethods } from './list-sign-in-methods'

const answering = (body: unknown, status = 200) =>
  createAuthClient({ fetch: async () => Response.json(body, { status }) })

describe('listSignInMethods', () => {
  it('reads whether the account has a password and which Google account is linked', async () => {
    const auth = answering([
      { id: 'a1', providerId: 'credential' },
      { id: 'a2', providerId: 'google' }
    ])

    expect(await listSignInMethods(auth)).toEqual({ password: true, googleAccountId: 'a2' })
  })

  it('reads an account made with Google alone as one without a password', async () => {
    expect(await listSignInMethods(answering([{ id: 'a2', providerId: 'google' }]))).toEqual({
      password: false,
      googleAccountId: 'a2'
    })
  })

  it('fails with Better Auth’s status, 401 when the session has ended', async () => {
    await expect(listSignInMethods(answering({ code: 'UNAUTHORIZED' }, 401))).rejects.toMatchObject({
      kind: 'http',
      status: 401
    })
  })

  it('fails as a network error when the API cannot be reached', async () => {
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(listSignInMethods(auth)).rejects.toBeInstanceOf(ApiError)
    await expect(listSignInMethods(auth)).rejects.toMatchObject({ kind: 'network' })
  })
})
