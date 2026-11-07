import { ApiError, type AuthClient, createQuery } from '#shared/api'
import { forgetSession, rememberSession } from '../model/session-hint'
import { getSessionUser } from './get-session-user'

/**
 * Who is signed in, as a router query (ADR 0038): the session's route starts it at boot, and the session
 * guard reads the same answer. Every answer also sets the device's hint of a session (ADR 0042): a user
 * remembers it, a visitor or a session that ended forgets it, and any other failure leaves it as it was.
 */
export const sessionQuery = (auth: AuthClient) =>
  createQuery(
    () =>
      getSessionUser(auth).then(
        (user) => {
          rememberSession()
          return user
        },
        (failure: unknown) => {
          if (failure instanceof ApiError && failure.status === 401) forgetSession()
          throw failure
        }
      ),
    'session'
  )
