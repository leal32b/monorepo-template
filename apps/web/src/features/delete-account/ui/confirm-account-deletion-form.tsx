import type { AccountDeletion } from '@repo/contracts'
import { ConfirmForm, Link } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { forgetSession } from '#entities/sessions'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { useDeletionMessage } from './use-deletion-message'

export type ConfirmAccountDeletionFormProps = {
  /** The token of the emailed link. */
  token: string
  /** What deleting the account does, read as the screen opened. */
  plan: AccountDeletion
  /** Called once the account is gone, its session with it. */
  onDeleted: () => void
  onCancel: () => void
}

/** Better Auth's codes for a link that cannot be used: expired, used, or another user's. */
const expired = new Set(['INVALID_TOKEN', 'FAILED_TO_GET_USER_INFO'])

/**
 * The last step of ADR 0049: says once more what goes, then sends the link's token back with the session,
 * and only a session of the user the link was sent to can use it. A link that expired or was used says
 * where to ask for a new one; an organization that came to block it says where the way out is.
 */
export function ConfirmAccountDeletionForm(props: ConfirmAccountDeletionFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const message = useDeletionMessage()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const submit = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) => auth.deleteUser({ token: props.token }, options))
    setPending(false)
    if (failed !== undefined) return setFailure(failed)
    forgetSession()
    props.onDeleted()
  }

  const words = (current: AuthFailure) => {
    if (current.code !== undefined && expired.has(current.code)) return t('accountDeletion.confirm.expired')
    if (current.code === 'SOLE_OWNER_OF_SHARED_ORGANIZATION') return t('accountDeletion.errors.blocked')
    return undefined
  }

  return (
    <ConfirmForm
      message={message(props.plan)}
      confirmLabel={t('accountDeletion.confirm.submit')}
      cancelLabel={t('actions.cancel')}
      pending={pending()}
      onConfirm={submit}
      onCancel={props.onCancel}
      failure={
        <Show when={failure()}>
          {(current) => (
            <AuthFailureAlert
              failure={current()}
              message={words(current())}
              action={
                <Show when={words(current()) !== undefined}>
                  <Link href="/settings/profile">{t('accountDeletion.confirm.profile')}</Link>
                </Show>
              }
            />
          )}
        </Show>
      }
    />
  )
}
