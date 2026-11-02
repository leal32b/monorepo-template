import type { MeResponse } from '@repo/contracts'
import { ApiError, type AuthClient } from '#shared/api'

/**
 * Who is signed in, from Better Auth (ADR 0020), read with `disableRefresh` so that reading writes
 * nothing. A visitor is an answer, not a failed request: Better Auth says 200 with nothing, so the
 * browser logs no error for a page opened without a session. It fails like any call, with an
 * `ApiError`: 401 for "no session", the answer's status for another error, `network` when the API
 * cannot be reached.
 */
export async function getSessionUser(auth: AuthClient): Promise<MeResponse> {
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

  const { id, email, name } = answer.data.user
  return { id, email, name }
}
