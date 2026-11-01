import { Button, Link } from '@repo/ui'
import { createSignal } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type UnlinkGoogleProps = {
  /** Better Auth's id of the Google account to unlink. */
  accountId: string
  /** Called once it is unlinked. */
  onUnlinked: () => void
  /** Called with what went wrong, to show it where the user acted with `UnlinkGoogleFailure`. */
  onFailure: (failure: AuthFailure) => void
}

/**
 * Unlinks the Google account, with no confirmation: it can be linked again at any time. It is only
 * the button; the screen says what happened. Better Auth asks for a session signed in within the
 * last day, so an older one is asked to sign in again first (`UnlinkGoogleFailure`).
 */
export function UnlinkGoogle(props: UnlinkGoogleProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const unlink = async () => {
    setPending(true)
    const failed = await callAuth((options) => auth.unlinkAccount({ accountId: props.accountId }, options))
    setPending(false)
    if (failed === undefined) props.onUnlinked()
    else props.onFailure(failed)
  }

  return (
    <Button disabled={pending()} onClick={unlink}>
      {t('unlinkGoogle.submit')}
    </Button>
  )
}

/** What went wrong unlinking: an old session is asked to sign in again; anything else in the usual words. */
export function UnlinkGoogleFailure(props: { failure: AuthFailure }) {
  const { t } = useI18n()
  const stale = () => props.failure.code === 'SESSION_NOT_FRESH'

  return (
    <AuthFailureAlert
      failure={props.failure}
      message={stale() ? t('unlinkGoogle.stale') : undefined}
      action={stale() && <Link href="/login?next=%2Fsettings%2Fsecurity">{t('unlinkGoogle.signInAgain')}</Link>}
    />
  )
}
