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
    if (error instanceof ApiError && error.kind === 'http') {
      return { status: error.status, code: error.problem?.code, requestId: error.problem?.requestId }
    }
    return { status: undefined, code: undefined, requestId: undefined }
  }
}
