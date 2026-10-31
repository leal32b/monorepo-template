import { twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient as createBetterAuthClient } from 'better-auth/solid'

export type AuthClientOptions = {
  /** How requests go out: `window.fetch` in the app, a fake in tests. */
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

/**
 * Better Auth's client (ADR 0020), with the two-factor plugin. It calls `/api/auth` on the page's own
 * origin, which the Worker forwards to the API, so the session cookie stays first-party.
 */
export function createAuthClient({ fetch }: AuthClientOptions) {
  return createBetterAuthClient({
    basePath: '/api/auth',
    fetchOptions: { customFetchImpl: fetch },
    plugins: [twoFactorClient()]
  })
}

export type AuthClient = ReturnType<typeof createAuthClient>
