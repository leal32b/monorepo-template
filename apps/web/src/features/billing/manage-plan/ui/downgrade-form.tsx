import type { PlanKey } from '@repo/contracts'
import { Button, FormActions } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { changePlan } from '#entities/subscriptions'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { isStale } from '../model/billing-failure'
import { BillingFailureAlert } from './billing-failure-alert'

export type DowngradeFormProps = {
  organizationId: string
  /** The cheaper plan. */
  plan: PlanKey
  version: number
  /** From when it starts, and that nothing is refunded (ADR 0063). */
  message: string
  onChanged: () => void
  /** The subscription is not as the page read it (a 409): the page reads it again and says why. */
  onStale: (failure: AuthFailure) => void
  onCancel: () => void
}

/**
 * Schedules a cheaper plan for the end of the paid period (ADR 0063): the organization keeps what it paid
 * for until then, and nothing is refunded, as the message says before the button. It can be withdrawn
 * until then ("Keep Pro").
 */
export function DowngradeForm(props: DowngradeFormProps) {
  const api = useApi()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    setFailure(undefined)
    setPending(true)
    const failed = await callApi(() =>
      changePlan(api, props.organizationId, { plan: props.plan, version: props.version })
    )
    setPending(false)
    if (failed === undefined) return props.onChanged()
    if (isStale(failed)) props.onStale(failed)
    else setFailure(failed)
  }

  return (
    <form noValidate onSubmit={submit} class="flex flex-col gap-4">
      <p class="text-muted-foreground">{props.message}</p>
      <FormActions>
        <Button type="submit" variant="primary" disabled={pending()}>
          {t('billing.catalogue.change', { plan: t(`billing.plans.${props.plan}`) })}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </FormActions>
      <Show when={failure()}>{(current) => <BillingFailureAlert failure={current()} />}</Show>
    </form>
  )
}
