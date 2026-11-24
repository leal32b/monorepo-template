import { ConfirmForm } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { cancelSubscription } from '#entities/subscriptions'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { isStale } from '../model/billing-failure'
import { BillingFailureAlert } from './billing-failure-alert'

export type CancelPlanFormProps = {
  organizationId: string
  version: number
  /** Until when the plan stays paid, that nothing is deleted, and that it can be kept until then (ADR 0063). */
  message: string
  onChanged: () => void
  /** The subscription is not as the page read it (a 409): the page reads it again and says why. */
  onStale: (failure: AuthFailure) => void
  onCancel: () => void
}

/**
 * "Cancel plan", asked once in the row's panel (ADR 0063): the plan ends when its paid period ends, read
 * only after that, and it can be kept until then. Nothing is deleted, so it asks for nothing to type.
 */
export function CancelPlanForm(props: CancelPlanFormProps) {
  const api = useApi()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const confirm = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callApi(() => cancelSubscription(api, props.organizationId, { version: props.version }))
    setPending(false)
    if (failed === undefined) return props.onChanged()
    if (isStale(failed)) props.onStale(failed)
    else setFailure(failed)
  }

  return (
    <ConfirmForm
      message={props.message}
      confirmLabel={t('billing.cancel.action')}
      cancelLabel={t('subscription.actions.keep')}
      pending={pending()}
      onConfirm={confirm}
      onCancel={props.onCancel}
      failure={<Show when={failure()}>{(current) => <BillingFailureAlert failure={current()} />}</Show>}
    />
  )
}
