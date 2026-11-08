import type { AccountDeletion } from '@repo/contracts'
import { ConfirmForm } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { useDeletionMessage } from './use-deletion-message'

export type RequestAccountDeletionFormProps = {
  /** What deleting the account would do, read before the panel opened. */
  plan: AccountDeletion
  /** Where the link goes: the address the user confirmed. */
  email: string
  /** Called once the link is on its way. */
  onSent: () => void
  /** Called when an organization blocks it after all, so the screen reads what it would do again. */
  onBlocked: () => void
  onCancel: () => void
}

/**
 * The first of the two steps of ADR 0049: says what deleting the account does, then emails a link to
 * confirm it. Nothing is deleted here, so a stolen session alone cannot delete the account.
 */
export function RequestAccountDeletionForm(props: RequestAccountDeletionFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const message = useDeletionMessage()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const submit = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) => auth.deleteUser({}, options))
    setPending(false)
    if (failed === undefined) props.onSent()
    else if (failed.code === 'SOLE_OWNER_OF_SHARED_ORGANIZATION') props.onBlocked()
    else setFailure(failed)
  }

  return (
    <ConfirmForm
      message={`${message(props.plan)} ${t('accountDeletion.request.intro', { email: props.email })}`}
      confirmLabel={t('accountDeletion.request.submit')}
      cancelLabel={t('actions.cancel')}
      pending={pending()}
      onConfirm={submit}
      onCancel={props.onCancel}
      failure={<Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>}
    />
  )
}
