import { type IdentityOptions, identityOptionsSchema } from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/** `GET /api/identity/options`: what the API offers for signing in, such as Google. */
export const getIdentityOptions = (client: ApiClient) => client.get('/api/identity/options', identityOptionsSchema)

/**
 * The options asked for at start-up, so the entry screens know at their first paint whether to show
 * Google and nothing moves when the answer comes. It gives up after `waitMs`, or when the API fails,
 * with `undefined`: a screen then asks for itself, and holds its place while it waits.
 */
export async function loadIdentityOptions(client: ApiClient, waitMs: number): Promise<IdentityOptions | undefined> {
  const gaveUp = new Promise<undefined>((resolve) => setTimeout(resolve, waitMs))
  return Promise.race([getIdentityOptions(client).catch(() => undefined), gaveUp])
}
