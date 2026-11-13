import type { CheckoutKind, PlanKey } from '@repo/contracts'
import { Button } from '@repo/ui'
import { createSignal } from 'solid-js'
import { abandonCheckout, changePlan, resumeSubscription } from '#entities/subscriptions'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'

/**
 * What one press does: keep a plan set to end (`resume`), keep the plan paid for instead of a scheduled
 * downgrade (`keep`), or cancel the open payment (`abandon`), named by what it was for.
 */
export type PlanAction =
  | { kind: 'resume' }
  | { kind: 'keep'; plan: PlanKey }
  | { kind: 'abandon'; checkout: CheckoutKind }

export type PlanActionButtonProps = {
  organizationId: string
  action: PlanAction
  version: number
  disabled?: boolean | undefined
  onDone: () => void
  onFailed: (failure: AuthFailure) => void
}

/**
 * A change that undoes another, in one press: each puts back what the owner had, so it asks nothing first
 * (the minimize-support skill prefers recovery to a confirmation). It waits while its request is on its way.
 */
export function PlanActionButton(props: PlanActionButtonProps) {
  const api = useApi()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const label = () => {
    const { action } = props
    if (action.kind === 'resume') return t('billing.actions.keep')
    if (action.kind === 'keep') return t('billing.downgrade.keep', { plan: t(`billing.plans.${action.plan}`) })
    return t(action.checkout === 'upgrade' ? 'billing.checkout.cancelUpgrade' : 'billing.checkout.cancelSubscription')
  }
  const run = () => {
    const { action, organizationId, version } = props
    if (action.kind === 'resume') return resumeSubscription(api, organizationId, { version })
    if (action.kind === 'keep') return changePlan(api, organizationId, { plan: action.plan, version })
    return abandonCheckout(api, organizationId)
  }

  const press = async () => {
    setPending(true)
    const failed = await callApi(run)
    setPending(false)
    if (failed === undefined) props.onDone()
    else props.onFailed(failed)
  }

  return (
    <Button variant="secondary" disabled={pending() || props.disabled} onClick={press}>
      {label()}
    </Button>
  )
}
