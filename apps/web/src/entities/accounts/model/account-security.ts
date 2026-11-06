import type { SignInMethods } from '../api/list-sign-in-methods'

/** How the signed-in user can sign in, and whether signing in with the password asks for a second step. */
export type AccountSecurity = SignInMethods & {
  email: string
  /** Whether signing in with the password also asks for a code from the authenticator app. */
  twoFactor: boolean
}
