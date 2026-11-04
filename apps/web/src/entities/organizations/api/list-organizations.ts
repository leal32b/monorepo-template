import { ApiError, type AuthClient } from '#shared/api'

/** An organization the signed-in user belongs to: its id is the API's key, its slug the web's (ADR 0034). */
export type Organization = { id: string; name: string; slug: string }

/**
 * The organizations of the signed-in user, from Better Auth (ADR 0033). Fails like any call, with an
 * `ApiError`: the answer's status, or `network` when the API cannot be reached.
 */
export async function listOrganizations(auth: AuthClient): Promise<Organization[]> {
  let answer: Awaited<ReturnType<AuthClient['organization']['list']>>
  try {
    answer = await auth.organization.list()
  } catch (cause) {
    throw new ApiError('network', 'The organizations could not be read.', { cause })
  }
  if (answer.error) {
    throw new ApiError('http', `Better Auth answered ${answer.error.status}.`, { status: answer.error.status })
  }
  return answer.data.map(({ id, name, slug }: Organization) => ({ id, name, slug }))
}
