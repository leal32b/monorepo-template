import { ApiError, type AuthClient, createQuery } from '#shared/api'

/** How the signed-in user can sign in: with a password, with Google, or both. */
export type SignInMethods = {
  /** Whether the account has a password; one made with Google alone has none. */
  password: boolean
  /** Better Auth's id of the linked Google account, the one to unlink. */
  googleAccountId: string | undefined
}

/**
 * The accounts of the signed-in user, from Better Auth (ADR 0020): a password is the `credential` one.
 * Fails with an `ApiError` carrying Better Auth's status, 401 when the session has ended, or `network`
 * when the API cannot be reached.
 */
export async function listSignInMethods(auth: AuthClient): Promise<SignInMethods> {
  let answer: Awaited<ReturnType<AuthClient['listAccounts']>>
  try {
    answer = await auth.listAccounts()
  } catch (cause) {
    throw new ApiError('network', 'The ways to sign in could not be read.', { cause })
  }
  if (!answer.data) {
    throw new ApiError('http', `Better Auth answered ${answer.error.status}.`, { status: answer.error.status })
  }
  const accounts: { id: string; providerId: string }[] = answer.data
  return {
    password: accounts.some((account) => account.providerId === 'credential'),
    googleAccountId: accounts.find((account) => account.providerId === 'google')?.id
  }
}

/** The ways to sign in, as a router query (ADR 0038): the security screen's route starts it. */
export const signInMethodsQuery = (auth: AuthClient) => createQuery(() => listSignInMethods(auth), 'sign-in-methods')
