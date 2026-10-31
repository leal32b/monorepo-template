import { ApiError } from './client'
import type { ApiClient } from './context'

/**
 * The same client, calling `handle` when the API answers 401, which means the session ended. The call
 * still fails, so the screen that made it stops where it is while `handle` takes the user away.
 */
export function whenUnauthorized(client: ApiClient, handle: () => void): ApiClient {
  return {
    get: (path, schema, options) =>
      client.get(path, schema, options).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) handle()
        throw error
      })
  }
}
