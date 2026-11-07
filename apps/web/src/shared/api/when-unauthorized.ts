import { ApiError } from './client'
import type { ApiClient } from './context'

/**
 * The same client, calling `handle` when the API answers 401, which means the session ended. The call
 * still fails, so the screen that made it stops where it is while `handle` takes the user away.
 */
export function whenUnauthorized(client: ApiClient, handle: () => void): ApiClient {
  const watch = (failure: unknown): never => {
    if (failure instanceof ApiError && failure.status === 401) handle()
    throw failure
  }
  return {
    get: (path, schema, options) => client.get(path, schema, options).catch(watch),
    send: (method, path, body, schema) => client.send(method, path, body, schema).catch(watch)
  }
}
