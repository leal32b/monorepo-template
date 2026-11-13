import { Button } from '@repo/ui'
import { createSignal } from 'solid-js'
import { getPaymentPage } from '#entities/subscriptions'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'

export type PayNowButtonProps = {
  organizationId: string
  disabled?: boolean | undefined
  /** The button's element, so the panel it opens when there is no page can give it focus back. */
  ref?: ((button: HTMLButtonElement) => void) | undefined
  /** The provider has no page for what is overdue: a new checkout pays it (ADR 0067). */
  onNoPage: () => void
  onFailed: (failure: AuthFailure) => void
}

/**
 * "Pay now" while a payment is late (ADR 0063): the provider's page for what is overdue, when it has one;
 * otherwise the page offers a new checkout of the plan, which replaces the overdue subscription.
 */
export function PayNowButton(props: PayNowButtonProps) {
  const api = useApi()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const press = async () => {
    setPending(true)
    let url: string | null | undefined
    const failed = await callApi(async () => {
      ;({ url } = await getPaymentPage(api, props.organizationId))
    })
    if (typeof url === 'string') return window.location.assign(url)
    setPending(false)
    if (failed === undefined) props.onNoPage()
    else props.onFailed(failed)
  }

  return (
    <Button ref={props.ref} variant="secondary" disabled={pending() || props.disabled} onClick={press}>
      {t('billing.actions.pay')}
    </Button>
  )
}
