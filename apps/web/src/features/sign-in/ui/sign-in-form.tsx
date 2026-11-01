import { Button, Field, PasswordField } from '@repo/ui'
import { createSignal, type JSX, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { type SignInValues, validateSignIn } from '../model/validate-sign-in'

export type SignInFormProps = {
  /** Called once the user is signed in. */
  onSignedIn: () => void
  /** Called instead when the account has a second step: the password was right, the code comes next. */
  onSecondStep: () => void
  /**
   * What the page has to say before any sign-in, such as a confirmation link that expired. It shows
   * below the button, where the answer to a sign-in shows, and gives way to it: nothing above moves.
   */
  notice?: JSX.Element
  /**
   * What to offer when the email is not confirmed yet, for that address. The page passes the resend
   * button: it is another feature, and a feature does not import another (ADR 0010).
   */
  resend: (email: string) => JSX.Element
  /**
   * The way to a new password, beside the password's label, where it is looked for after a wrong
   * one. It gets the email typed so far, to carry over. The page passes the link, as with `resend`.
   */
  forgotPassword: (email: () => string) => JSX.Element
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
  const [failed, setFailed] = createSignal<{ failure: AuthFailure; email: string }>()
  const [pending, setPending] = createSignal(false)
  const [sent, setSent] = createSignal(false)
  const checks = createFormChecks(() => validateSignIn({ email: email(), password: password() }))

  const errorOf = (field: keyof SignInValues) => {
    const problem = checks.problems()[field]
    return problem && t(`auth.errors.${problem}`)
  }

  /** The sign-in failures this screen has its own words for. */
  const wordsFor = (code: string | undefined) => {
    if (code === 'INVALID_EMAIL_OR_PASSWORD') return t('signIn.errors.wrongCredentials')
    if (code === 'EMAIL_NOT_VERIFIED') return t('signIn.errors.unconfirmed')
    return undefined
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    setFailed(undefined)
    const values = checks.submit(event.currentTarget)
    if (values === undefined) return

    setSent(true)
    setPending(true)
    let secondStep = false
    const failure = await callAuth((options) =>
      auth.signIn.email(values, {
        ...options,
        // With a second factor, Better Auth answers the password with a challenge, not a session.
        onSuccess: ({ data }) => {
          secondStep = data.twoFactorRedirect === true
        }
      })
    )
    setPending(false)
    if (failure !== undefined) setFailed({ failure, email: values.email })
    else if (secondStep) props.onSecondStep()
    else props.onSignedIn()
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
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
        labelAction={props.forgotPassword(email)}
        onChange={setPassword}
        error={errorOf('password')}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
        {t('signIn.submit')}
      </Button>
      <Show when={failed()} fallback={!sent() && props.notice}>
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
