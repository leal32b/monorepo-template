import { passwordLength } from '@repo/contracts'
import { Button, Field, PasswordField } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { type SignUpValues, validateSignUp } from '../model/validate-sign-up'

export type SignUpFormProps = {
  /** What the fields start with: what was sent before, when the user goes back to change it. */
  initial?: SignUpValues | undefined
  /** Called with what was sent, cleaned; the confirmation link went to its email. */
  onSignedUp: (values: SignUpValues) => void
}

/**
 * Name, email and a new password. Fields are checked on submit, and again when one is left after
 * that, never while typing; the button stays disabled while the sign-up is on its way. A password the
 * API found in a data breach is marked on its field; anything else that goes wrong shows below the button.
 */
export function SignUpForm(props: SignUpFormProps) {
  const auth = useAuth()
  const { t, locale } = useI18n()
  const [name, setName] = createSignal(props.initial?.name ?? '')
  const [email, setEmail] = createSignal(props.initial?.email ?? '')
  const [password, setPassword] = createSignal(props.initial?.password ?? '')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const breached = new Set<string>()
  const checks = createFormChecks(() =>
    validateSignUp({ name: name(), email: email(), password: password() }, breached)
  )

  const errorOf = (field: keyof SignUpValues) => {
    const problem = checks.problems()[field]
    return problem && t(`auth.errors.${problem}`, passwordLength)
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const values = checks.submit(form)
    if (values === undefined) return

    setPending(true)
    const failed = await callAuth((options) =>
      auth.signUp.email({ ...values, locale: locale(), callbackURL: '/' }, options)
    )
    setPending(false)

    if (failed === undefined) {
      props.onSignedUp(values)
    } else if (failed.code === 'PASSWORD_COMPROMISED') {
      // Now a problem of the password field, checked like any other.
      breached.add(values.password)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t('auth.name')}
        name="name"
        autocomplete="name"
        value={name()}
        onChange={setName}
        error={errorOf('name')}
      />
      <Field
        label={t('auth.email')}
        name="email"
        type="email"
        autocomplete="email"
        value={email()}
        onChange={setEmail}
        error={errorOf('email')}
      />
      <PasswordField
        label={t('auth.password')}
        toggleLabel={t('auth.showPassword')}
        name="password"
        autocomplete="new-password"
        description={t('auth.newPasswordHint', passwordLength)}
        value={password()}
        onChange={setPassword}
        error={errorOf('password')}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
        {t('signUp.submit')}
      </Button>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
    </form>
  )
}
