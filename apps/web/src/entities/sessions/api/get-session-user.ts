import type { MeResponse } from '@repo/contracts'
import { ApiError, type AuthClient } from '#shared/api'

/** Who is signed in, and whether signing in with the password asks for a second step. */
export type SessionUser = MeResponse & { twoFactorEnabled: boolean }

/**
 * Who is signed in, from Better Auth (ADR 0020), read with `disableRefresh` so that reading writes
 * nothing. It carries the second step's state too, so the security screen reads no session of its own
 * (ADR 0038). A visitor is an answer, not a failed request: Better Auth says 200 with nothing, so the
 * browser logs no error for a page opened without a session. It fails like any call, with an
 * `ApiError`: 401 for "no session", the answer's status for another error, `network` when the API
 * cannot be reached.
 */
export async function getSessionUser(auth: AuthClient): Promise<SessionUser> {
  let answer: Awaited<ReturnType<AuthClient['getSession']>>
  try {
    answer = await auth.getSession({ query: { disableRefresh: true } })
  } catch (cause) {
    throw new ApiError('network', 'The session could not be read.', { cause })
  }

  if (answer.error) {
    throw new ApiError('http', `Better Auth answered ${answer.error.status}.`, { status: answer.error.status })
  }
  if (!answer.data) throw new ApiError('http', 'There is no session.', { status: 401 })

  const { id, email, name, twoFactorEnabled } = answer.data.user
  return { id, email, name, twoFactorEnabled: twoFactorEnabled === true }
}
