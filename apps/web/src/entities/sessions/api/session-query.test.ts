import { createAuthClient } from '#shared/api'
import { forgetSession, hasSession, rememberSession } from '../model/session-hint'
import { sessionQuery } from './session-query'

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }

describe('sessionQuery', () => {
  afterEach(() => window.localStorage.clear())

  it('remembers on this device that a session was seen, once the read finds a user', async () => {
    const auth = createAuthClient({ fetch: async () => Response.json({ session: { id: 's1' }, user: ada }) })

    await sessionQuery(auth)()

    expect(hasSession()).toBe(true)
  })

  it('forgets it when the read finds a visitor or a session that ended', async () => {
    rememberSession()
    const auth = createAuthClient({ fetch: async () => Response.json(null) })

    await expect(sessionQuery(auth)()).rejects.toMatchObject({ status: 401 })

    expect(hasSession()).toBe(false)
  })

  it('keeps what it knew when the read fails for another reason, since the session may still be there', async () => {
    rememberSession()
    const auth = createAuthClient({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })

    await expect(sessionQuery(auth)()).rejects.toMatchObject({ kind: 'network' })

    expect(hasSession()).toBe(true)
    forgetSession()
  })
})
