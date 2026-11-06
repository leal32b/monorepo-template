import { createAuthClient as createBetterAuthClient } from 'better-auth/client'
import { inferAdditionalFields, organizationClient, twoFactorClient } from 'better-auth/client/plugins'

export type AuthClientOptions = {
  /** How requests go out: `window.fetch` in the app, a fake in tests. */
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

/**
 * Better Auth's client (ADR 0020), with the two-factor and organization plugins. It calls `/api/auth` on the page's own
 * origin, which the Worker forwards to the API, so the session cookie stays first-party. The plain client, not the
 * Solid one: the app reads through its own queries (ADR 0038), never Better Auth's stores, so their bindings stay out
 * of the first download (W12).
 */
export function createAuthClient({ fetch }: AuthClientOptions) {
  return createBetterAuthClient({
    basePath: '/api/auth',
    fetchOptions: { customFetchImpl: fetch },
    plugins: [
      twoFactorClient(),
      // Organizations, members, invitations and custom roles (ADR 0033). What the caller may do comes
      // from the API's `/me`, never from a role name, so the client holds no access control.
      organizationClient({ dynamicAccessControl: { enabled: true } }),
      // The user's field the API adds: a sign-up must say which language its emails are written in.
      inferAdditionalFields({ user: { locale: { type: 'string', required: true } } })
    ]
  })
}

export type AuthClient = ReturnType<typeof createAuthClient>
