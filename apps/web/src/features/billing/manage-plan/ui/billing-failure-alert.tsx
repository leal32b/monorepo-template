import type { AuthFailure } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { billingFailureKind } from '../model/billing-failure'

/** A billing route's refusal in the plan page's words, or the generic ones with the reference support needs. */
export function BillingFailureAlert(props: { failure: AuthFailure }) {
  const { t } = useI18n()
  const message = () => {
    const kind = billingFailureKind(props.failure)
    return kind === undefined ? undefined : t(`billing.errors.${kind}`)
  }
  return <AuthFailureAlert failure={props.failure} message={message()} />
}
