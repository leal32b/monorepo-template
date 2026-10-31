import { Button, Field, PasswordField } from '@repo/ui'
import { createSignal, type JSX, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { type SignInProblems, type SignInValues, validateSignIn } from '../model/validate-sign-in'

export type SignInFormProps = {
  /** Called once the user is signed in. */
  onSignedIn: () => void
  /**
   * What to offer when the email is not confirmed yet, for that address. The page passes the resend
   * button: it is another feature, and a feature does not import another (ADR 0010).
   */
  resend: (email: string) => JSX.Element
}

/**
 * Email and password, checked like the sign-up: on submit, and again when a field is left after that,
 * except on the way to a button. The button stays disabled while the sign-in is on its way; what goes
 * wrong shows below it, without saying whether the email or the password was the wrong one.
 */
export function SignInForm(props: SignInFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [problems, setProblems] = createSignal<SignInProblems>({})
  const [failed, setFailed] = createSignal<{ failure: AuthFailure; email: string }>()
  const [submitted, setSubmitted] = createSignal(false)
  const [pending, setPending] = createSignal(false)

  const check = () => {
    const result = validateSignIn({ email: email(), password: password() })
    setProblems(result.ok ? {} : result.problems)
    return result
  }

  const errorOf = (field: keyof SignInValues) => {
    const problem = problems()[field]
    return problem && t(`auth.errors.${problem}`)
  }

  /** The sign-in failures this screen has its own words for. */
  const wordsFor = (code: string | undefined) => {
    if (code === 'INVALID_EMAIL_OR_PASSWORD') return t('signIn.errors.wrongCredentials')
    if (code === 'EMAIL_NOT_VERIFIED') return t('signIn.errors.unconfirmed')
    return undefined
  }

  const recheck = (event: FocusEvent) => {
    if (submitted() && !(event.relatedTarget instanceof HTMLButtonElement)) check()
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    setSubmitted(true)
    setFailed(undefined)
    const result = check()
    if (!result.ok) {
      event.currentTarget.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setPending(true)
    const failure = await callAuth((options) => auth.signIn.email(result.values, options))
    setPending(false)
    if (failure === undefined) props.onSignedIn()
    else setFailed({ failure, email: result.values.email })
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={recheck} class="flex flex-col gap-4">
      <Field
        label={t('auth.email')}
        name="email"
        type="email"
        autocomplete="username"
        onChange={setEmail}
        error={errorOf('email')}
      />
      <PasswordField
        label={t('auth.password')}
        toggleLabel={t('auth.showPassword')}
        name="password"
        autocomplete="current-password"
        onChange={setPassword}
        error={errorOf('password')}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
        {t('signIn.submit')}
      </Button>
      <Show when={failed()}>
        {(current) => {
          // Read once: the alert is new for every failure, and its action is made only once.
          const { failure, email } = current()
          const action = failure.code === 'EMAIL_NOT_VERIFIED' ? props.resend(email) : undefined
          return <AuthFailureAlert failure={failure} message={wordsFor(failure.code)} action={action} />
        }}
      </Show>
    </form>
  )
}
