import { Button, Link } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type UnlinkGoogleProps = {
  /** Better Auth's id of the Google account to unlink. */
  accountId: string
  /** Called once it is unlinked. */
  onUnlinked: () => void
}

/**
 * Unlinks the Google account; it can be linked again at any time. Better Auth asks for a session
 * signed in within the last day, so an older one is asked to sign in again first.
 */
export function UnlinkGoogle(props: UnlinkGoogleProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const unlink = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) => auth.unlinkAccount({ accountId: props.accountId }, options))
    setPending(false)
    if (failed === undefined) props.onUnlinked()
    else setFailure(failed)
  }

  return (
    <div class="flex flex-col gap-4">
      <Button variant="outline" class="w-full sm:w-auto sm:self-start" disabled={pending()} onClick={unlink}>
        {t('unlinkGoogle.submit')}
      </Button>
      <Show when={failure()}>
        {(current) => {
          // Read once: the alert is new for every failure, and its link is made only once.
          const stale = current().code === 'SESSION_NOT_FRESH'
          return (
            <AuthFailureAlert
              failure={current()}
              message={stale ? t('unlinkGoogle.stale') : undefined}
              action={stale && <Link href="/login?next=%2Faccount">{t('unlinkGoogle.signInAgain')}</Link>}
            />
          )
        }}
      </Show>
    </div>
  )
}
