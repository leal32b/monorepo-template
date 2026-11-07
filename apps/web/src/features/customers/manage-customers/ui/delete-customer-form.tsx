import type { Customer } from '@repo/contracts'
import { ConfirmForm } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { deleteCustomer } from '#entities/customers'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { customerFailureKind } from '../model/customer-failure'

export type DeleteCustomerFormProps = {
  organizationId: string
  customer: Customer
  /** Called once the customer is deleted. */
  onDeleted: () => void
  /** Called when the customer is gone or was changed first, so the list can be read again. */
  onChanged: () => void
  onCancel: () => void
}

/**
 * Deletes an archived customer for good. It asks once, in the row, saying nothing can bring the details
 * back: the archive step before it is the safety net, so the question is plain.
 */
export function DeleteCustomerForm(props: DeleteCustomerFormProps) {
  const api = useApi()
  const { t } = useI18n()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const submit = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callApi(() => deleteCustomer(api, props.organizationId, props.customer.id))
    setPending(false)
    const kind = failed && customerFailureKind(failed)
    if (failed === undefined) props.onDeleted()
    else if (kind === 'gone' || kind === 'changed') props.onChanged()
    else setFailure(failed)
  }

  const message = (failed: AuthFailure) => {
    const kind = customerFailureKind(failed)
    return kind === undefined ? undefined : t(`customers.errors.${kind as 'notAllowed'}`)
  }

  return (
    <ConfirmForm
      message={t('customers.remove.warning', { name: props.customer.name })}
      confirmLabel={t('customers.remove.submit')}
      cancelLabel={t('actions.cancel')}
      pending={pending()}
      onConfirm={submit}
      onCancel={props.onCancel}
      failure={
        <Show when={failure()}>
          {(current) => <AuthFailureAlert failure={current()} message={message(current())} />}
        </Show>
      }
    />
  )
}
