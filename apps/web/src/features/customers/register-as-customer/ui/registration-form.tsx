import { customerLength, type PublicOrganization } from '@repo/contracts'
import { Alert, Button, createLate, Field, Fieldset, motion } from '@repo/ui'
import { createSignal, onMount, Show } from 'solid-js'
import { registerAsCustomer } from '#entities/customers'
import { type AuthFailure, callApi, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { type RegistrationField, validateRegistration } from '../model/validate-registration'

export type RegistrationFormProps = {
  /** The organization whose public page this is: its slug addresses the request, its name the texts. */
  organization: PublicOrganization
}

/** What a write that takes long says, as the skeletons do (ADR 0041): a sleeping host may be waking up. */
function SlowWrite() {
  const { t } = useI18n()
  const slow = createLate(motion.slowWaitDelay)
  return (
    <Show when={slow()}>
      <Alert variant="info">{t('appShell.slow')}</Alert>
    </Show>
  )
}

/**
 * A visitor, with no account, asks an organization to register them as a customer (ADR 0059, ADR 0060):
 * a name, and an email or a phone, which the form says before anyone trips on it. The fields are checked
 * with the API's own schema on submit, and again when one is left after that; the browser may fill them,
 * since they are the visitor's own. `referralCode` is a honeypot: out of view, hidden from assistive
 * technology, out of the tab order and of autofill, sent as it is.
 *
 * The API answers the same whatever it found (a new customer, an email already one, a filled honeypot), so
 * the form gives way to a message that says only that the details were received. The button waits while
 * the request is out, so a double click sends once; a refusal keeps what was typed and says what to do,
 * how long to wait after too many attempts included.
 */
export function RegistrationForm(props: RegistrationFormProps) {
  const api = useApi()
  const { t } = useI18n()
  const [values, setValues] = createSignal<Record<RegistrationField, string>>({ name: '', email: '', phone: '' })
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const [received, setReceived] = createSignal(false)
  const checks = createFormChecks(() => validateRegistration(values()))
  const names = () => ({ organization: props.organization.name })

  const set = (field: RegistrationField) => (value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }))
  const error = (field: RegistrationField | 'contact') => {
    const problem = checks.problems()[field]
    return problem && t(`registration.errors.${problem}`, { max: customerLength[field === 'phone' ? 'phone' : 'name'] })
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const input = checks.submit(form)
    if (input === undefined) {
      // The pair's problem has no field of its own to take the focus: the email is where to start.
      if (checks.problems().name === undefined) form.querySelector<HTMLElement>('[name="email"]')?.focus()
      return
    }

    setPending(true)
    const referralCode = (form.elements.namedItem('referralCode') as HTMLInputElement).value
    const failed = await callApi(() => registerAsCustomer(api, props.organization.slug, { ...input, referralCode }))
    setPending(false)
    if (failed === undefined) setReceived(true)
    else setFailure(failed)
  }

  return (
    <Show
      when={!received()}
      fallback={
        <Alert variant="success" tabIndex={-1} ref={(alert) => onMount(() => alert.focus())} class="outline-none">
          {t('registration.received', names())}
        </Alert>
      }
    >
      <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
        <Field
          label={t('registration.name')}
          name="name"
          autocomplete="name"
          value={values().name}
          onChange={set('name')}
          error={error('name')}
        />
        <Fieldset
          label={t('registration.contact')}
          description={t('registration.contactHint')}
          error={error('contact')}
          class="gap-4"
        >
          <Field
            label={t('registration.email')}
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="none"
            spellcheck={false}
            value={values().email}
            onChange={set('email')}
            error={error('email')}
          />
          <Field
            label={t('registration.phone')}
            name="phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            value={values().phone}
            onChange={set('phone')}
            error={error('phone')}
          />
        </Fieldset>
        {/* The honeypot (ADR 0059): no person sees, hears, tabs to or autofills it; a robot that fills every field does. */}
        <div aria-hidden="true" class="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
          <input type="text" name="referralCode" tabIndex={-1} autocomplete="off" />
        </div>
        <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
          {t('registration.submit')}
        </Button>
        <Show when={pending()}>
          <SlowWrite />
        </Show>
        <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
      </form>
    </Show>
  )
}
