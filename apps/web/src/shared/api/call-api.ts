import type { AuthFailure } from './call-auth'
import { ApiError } from './client'

/**
 * Runs one write on our API and returns what went wrong, or `undefined` when nothing did: the same
 * `AuthFailure` `callAuth` gives, so one alert (`AuthFailureAlert`) and one shape serve both. A call that
 * could not be made, or whose answer broke its contract, has no status, as a failure to reach the API.
 */
export async function callApi(call: () => Promise<unknown>): Promise<AuthFailure | undefined> {
  try {
    await call()
    return undefined
  } catch (error) {
    return failureOf(error)
  }
}

/**
 * What a failed call to our API says, in the shape `AuthFailureAlert` takes: the status, the problem's code
 * and request id, and how long to wait after a 429 (ADR 0059). A read that failed under `ReadFailure` is told
 * the same way.
 */
export function failureOf(error: unknown): AuthFailure {
  if (error instanceof ApiError && error.kind === 'http') {
    const retryAfter = error.problem?.retryAfter
    return {
      status: error.status,
      code: error.problem?.code,
      requestId: error.problem?.requestId,
      ...(retryAfter !== undefined && { retryAfter })
    }
  }
  return { status: undefined, code: undefined, requestId: undefined }
}
