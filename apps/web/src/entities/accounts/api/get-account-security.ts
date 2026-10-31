import { ApiError, type AuthClient } from '#shared/api'

/** How the signed-in user can sign in, and whether signing in with the password asks for a second step. */
export type AccountSecurity = {
  email: string
  /** Whether the account has a password; one made with Google alone has none. */
  password: boolean
  /** Better Auth's id of the linked Google account, the one to unlink. */
  googleAccountId: string | undefined
  /** Whether signing in with the password also asks for a code from the authenticator app. */
  twoFactor: boolean
}

/**
 * Reads the account security from Better Auth (ADR 0020): the accounts of the user, a password being
 * the `credential` one, and the session, read with `disableRefresh` so that reading writes nothing.
 * Fails with an `ApiError` carrying Better Auth's status, 401 when the session has ended.
 */
export async function getAccountSecurity(auth: AuthClient): Promise<AccountSecurity> {
  const [accounts, session] = await Promise.all([
    auth.listAccounts(),
    auth.getSession({ query: { disableRefresh: true } })
  ])
  if (!accounts.data || !session.data) {
    // No session at all is an answer too: Better Auth reads it as 200 with nothing in it.
    const status = accounts.error?.status ?? session.error?.status ?? 401
    throw new ApiError('http', `Better Auth answered ${status}.`, { status })
  }

  const providers = accounts.data
  return {
    email: session.data.user.email,
    password: providers.some((account) => account.providerId === 'credential'),
    googleAccountId: providers.find((account) => account.providerId === 'google')?.id,
    twoFactor: session.data.user.twoFactorEnabled === true
  }
}
