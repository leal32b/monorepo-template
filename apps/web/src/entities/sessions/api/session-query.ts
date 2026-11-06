import { type AuthClient, createQuery } from '#shared/api'
import { getSessionUser } from './get-session-user'

/**
 * Who is signed in, as a router query (ADR 0038): the session's route starts it at boot, beside the
 * organizations, and the session guard reads the same answer.
 */
export const sessionQuery = (auth: AuthClient) => createQuery(() => getSessionUser(auth), 'session')
