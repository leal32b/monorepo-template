import { type Customer, customerLength } from '@repo/contracts'
import { Button, Field, FormActions } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { createCustomer, updateCustomer } from '#entities/customers'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { customerFailureKind } from '../model/customer-failure'
import { type CustomerField, validateCustomer } from '../model/validate-customer'

export type CustomerFormProps = {
  organizationId: string
  /** The customer being edited; none to add one. */
  customer?: Customer | undefined
  /** Called with the customer once it is saved. */
  onSaved: (customer: Customer) => void
  /** Called when the customer no longer exists, so the list can be read again. */
  onGone: () => void
  onCancel: () => void
}

const maxOf = (field: CustomerField) => (field === 'email' ? undefined : customerLength[field])

/**
 * Adds a customer or edits one, in the same fields. Only the name is asked for. The fields are checked on
 * submit, and again when one is left after that; an email another customer has is said under the email,
 * and what the user typed stays.
 */
export function CustomerForm(props: CustomerFormProps) {
  const api = useApi()
  const { t } = useI18n()
  const [values, setValues] = createSignal<Record<CustomerField, string>>({
    name: props.customer?.name ?? '',
    email: props.customer?.email ?? '',
    phone: props.customer?.phone ?? '',
    company: props.customer?.company ?? '',
    notes: props.customer?.notes ?? ''
  })
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [emailTaken, setEmailTaken] = createSignal<string>()
  const [pending, setPending] = createSignal(false)
  const checks = createFormChecks(() => validateCustomer(values()))

  const set = (field: CustomerField) => (value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field === 'email') setEmailTaken(undefined)
  }
  const error = (field: CustomerField) => {
    if (field === 'email' && emailTaken() !== undefined && emailTaken() === values().email) {
      return t('customers.errors.emailTaken')
    }
    const problem = checks.problems()[field]
    return problem && t(`customers.errors.${problem}`, { max: maxOf(field) ?? 0 })
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const input = checks.submit(form)
    if (input === undefined) return

    setPending(true)
    let saved: Customer | undefined
    const failed = await callApi(async () => {
      saved =
        props.customer === undefined
          ? await createCustomer(api, props.organizationId, input)
          : await updateCustomer(api, props.organizationId, props.customer.id, input)
    })
    setPending(false)

    if (saved !== undefined) {
      props.onSaved(saved)
    } else if (failed !== undefined && customerFailureKind(failed) === 'emailTaken') {
      setEmailTaken(values().email)
      form.querySelector<HTMLElement>('[name="email"]')?.focus()
    } else if (failed !== undefined && customerFailureKind(failed) === 'gone') {
      props.onGone()
    } else {
      setFailure(failed)
    }
  }

  const message = (failed: AuthFailure) => {
    const kind = customerFailureKind(failed)
    return kind === undefined ? undefined : t(`customers.errors.${kind as 'notAllowed'}`)
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t('customers.form.name')}
        name="name"
        autocomplete="off"
        value={values().name}
        onChange={set('name')}
        error={error('name')}
      />
      <div class="grid gap-4 @md:grid-cols-2">
        <Field
          label={t('customers.form.email')}
          name="email"
          type="email"
          inputmode="email"
          autocomplete="off"
          autocapitalize="none"
          spellcheck={false}
          value={values().email}
          onChange={set('email')}
          error={error('email')}
        />
        <Field
          label={t('customers.form.phone')}
          name="phone"
          type="tel"
          inputmode="tel"
          autocomplete="off"
          value={values().phone}
          onChange={set('phone')}
          error={error('phone')}
        />
      </div>
      <Field
        label={t('customers.form.company')}
        name="company"
        autocomplete="off"
        value={values().company}
        onChange={set('company')}
        error={error('company')}
      />
      <Field
        multiline
        rows={4}
        label={t('customers.form.notes')}
        name="notes"
        value={values().notes}
        onChange={set('notes')}
        error={error('notes')}
      />
      <FormActions>
        <Button type="submit" variant="primary" disabled={pending()}>
          {t(props.customer === undefined ? 'customers.form.create' : 'customers.form.save')}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </FormActions>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} message={message(current())} />}</Show>
    </form>
  )
}
