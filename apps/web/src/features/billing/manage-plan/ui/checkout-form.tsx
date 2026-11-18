import { type PayerInput, type PaymentMethod, type PlanKey, paymentMethods } from '@repo/contracts'
import { Button, Field, Fieldset, FormActions, SegmentedControl } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { startCheckout } from '#entities/subscriptions'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { isStale } from '../model/billing-failure'
import { type PayerField, validatePayer } from '../model/validate-payer'
import { BillingFailureAlert } from './billing-failure-alert'

export type CheckoutFormProps = {
  organizationId: string
  plan: PlanKey
  /** The version of the subscription the page read (ADR 0048). */
  version: number
  /** The plan page's path: the provider sends the owner back to it (ADR 0067). */
  returnTo: string
  /** What choosing the plan costs and from when, said before the button (ADR 0063). */
  message: string
  /** An upgrade below the provider's minimum charge: nothing to pay, so no way to pay is asked. */
  free?: boolean | undefined
  /**
   * A subscription asks whom it charges (ADR 0069), with this email filled in, the signed-in owner's; an
   * upgrade leaves it unset, since the provider already charges someone.
   */
  payerEmail?: string | undefined
  /** The plan changed at once, as a free upgrade does: the page reads it again. */
  onChanged: () => void
  /** The subscription is not as the page read it (a 409): the page reads it again and says why. */
  onStale: (failure: AuthFailure) => void
  onCancel: () => void
}

/**
 * Chooses a plan through the checkout (ADR 0063, ADR 0067): says what is paid now and from when, asks how
 * to pay (card, Pix or boleto: the provider opens a different page for each), then leaves for the
 * provider's page, where money moves. A subscription also asks whom it charges: the name and the CPF or
 * CNPJ the charges are issued to, and the email the provider's notices go to, checked on submit (ADR 0069).
 * The button keeps waiting while the browser leaves, so a second press sends nothing; a second request
 * would get the same page back anyway. Below the provider's minimum the plan changes at once, and nothing
 * is asked.
 */
export function CheckoutForm(props: CheckoutFormProps) {
  const api = useApi()
  const { t } = useI18n()
  const [method, setMethod] = createSignal<PaymentMethod>('card')
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [payer, setPayer] = createSignal<PayerInput>({ name: '', taxId: '', email: props.payerEmail ?? '' })
  const checks = createFormChecks(() => validatePayer(payer()))
  const set = (field: PayerField) => (value: string) => setPayer((previous) => ({ ...previous, [field]: value }))
  const error = (field: PayerField) => {
    const problem = checks.problems()[field]
    return problem && t(`billing.payer.errors.${problem}`, { max: 100 })
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    setFailure(undefined)
    const named = props.payerEmail === undefined ? undefined : checks.submit(event.currentTarget)
    if (props.payerEmail !== undefined && named === undefined) return
    setPending(true)
    let url: string | null | undefined
    const failed = await callApi(async () => {
      ;({ url } = await startCheckout(api, props.organizationId, {
        plan: props.plan,
        method: method(),
        version: props.version,
        returnTo: props.returnTo,
        ...(named === undefined ? {} : { payer: named })
      }))
    })
    if (typeof url === 'string') return window.location.assign(url)
    setPending(false)
    if (failed === undefined) return props.onChanged()
    if (isStale(failed)) props.onStale(failed)
    else setFailure(failed)
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <p class="text-muted-foreground">{props.message}</p>
      <Show when={!props.free}>
        <Fieldset label={t('billing.catalogue.method')} description={t('billing.catalogue.methodHint')}>
          <SegmentedControl
            label={t('billing.catalogue.method')}
            value={method()}
            onChange={(value) => setMethod(value as PaymentMethod)}
            options={paymentMethods.map((value) => ({ value, label: t(`billing.catalogue.methods.${value}`) }))}
          />
        </Fieldset>
      </Show>
      <Show when={props.payerEmail !== undefined}>
        <Field
          label={t('billing.payer.name')}
          description={t('billing.payer.nameHint')}
          name="name"
          autocomplete="off"
          value={payer().name}
          onChange={set('name')}
          error={error('name')}
        />
        <Field
          label={t('billing.payer.taxId')}
          description={t('billing.payer.taxIdHint')}
          name="taxId"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck={false}
          value={payer().taxId}
          onChange={set('taxId')}
          error={error('taxId')}
        />
        <Field
          label={t('billing.payer.email')}
          description={t('billing.payer.emailHint')}
          name="email"
          type="email"
          inputmode="email"
          autocomplete="off"
          autocapitalize="none"
          spellcheck={false}
          value={payer().email}
          onChange={set('email')}
          error={error('email')}
        />
      </Show>
      <FormActions>
        <Button type="submit" variant="primary" disabled={pending()}>
          {props.free
            ? t('billing.catalogue.change', { plan: t(`billing.plans.${props.plan}`) })
            : t('billing.actions.continue')}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </FormActions>
      <Show when={failure()}>{(current) => <BillingFailureAlert failure={current()} />}</Show>
    </form>
  )
}
