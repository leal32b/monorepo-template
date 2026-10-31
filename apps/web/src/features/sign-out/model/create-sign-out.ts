import { createSignal } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'

/**
 * Signing out: `signOut` ends the session and then calls `onSignedOut`, the place to send the user
 * to. While it is on its way `pending` is true; when it fails the session goes on, and `failure` says why.
 */
export function createSignOut(onSignedOut: () => void) {
  const auth = useAuth()
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const signOut = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) => auth.signOut({ fetchOptions: options }))
    setPending(false)
    if (failed === undefined) onSignedOut()
    else setFailure(failed)
  }

  return { pending, failure, signOut }
}
