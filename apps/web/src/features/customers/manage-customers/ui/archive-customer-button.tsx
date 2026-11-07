import type { Customer } from '@repo/contracts'
import { Button } from '@repo/ui'
import { createSignal } from 'solid-js'
import { archiveCustomer, restoreCustomer } from '#entities/customers'
import { callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { customerFailureKind } from '../model/customer-failure'

export type ArchiveCustomerButtonProps = {
  organizationId: string
  customer: Customer
  /** Archives an active customer, or restores an archived one. */
  mode: 'archive' | 'restore'
  disabled?: boolean | undefined
  /** Called with the customer once it is archived or restored. */
  onDone: (customer: Customer) => void
  /** Called when the customer is gone or was changed first, so the list can be read again. */
  onChanged: () => void
  /** Called with the words for a refusal the user can read, such as a role that does not allow it. */
  onRefused: (message: string) => void
}

/**
 * One press archives or restores a customer: it can be undone, so it asks nothing first (the
 * minimize-support skill prefers recovery to a confirmation). It waits while its request is on its way.
 */
export function ArchiveCustomerButton(props: ArchiveCustomerButtonProps) {
  const api = useApi()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const press = async () => {
    setPending(true)
    let done: Customer | undefined
    const failed = await callApi(async () => {
      done = await (props.mode === 'archive' ? archiveCustomer : restoreCustomer)(
        api,
        props.organizationId,
        props.customer.id
      )
    })
    setPending(false)
    if (done !== undefined) return props.onDone(done)
    const kind = failed && customerFailureKind(failed)
    if (kind === 'gone' || kind === 'changed') props.onChanged()
    else props.onRefused(t(kind === 'notAllowed' ? 'customers.errors.notAllowed' : 'failure.unexpected'))
  }

  return (
    <Button variant="secondary" disabled={pending() || props.disabled} onClick={press}>
      {t(props.mode === 'archive' ? 'customers.actions.archive' : 'customers.actions.restore')}
    </Button>
  )
}
