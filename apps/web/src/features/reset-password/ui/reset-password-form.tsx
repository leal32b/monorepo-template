import { passwordLength } from '@repo/contracts'
import { Button, Link, PasswordField } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks, newPasswordProblem } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'

export type ResetPasswordFormProps = {
  /** The token of the link from the email. */
  token: string
  /** Called once the password is changed. */
  onReset: () => void
  /** Where to ask for a new link, when this one has expired or was used. */
  askAgain: string
}

/**
 * A new password, with the sign-up's rules: checked on submit, a password found in a data breach
 * marked on its field and not sent again. An expired or used link says so, with the way to ask again.
 */
export function ResetPasswordForm(props: ResetPasswordFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [password, setPassword] = createSignal('')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const breached = new Set<string>()
  const checks = createFormChecks(() => {
    const problem = newPasswordProblem(password(), breached)
    return problem ? { ok: false, problems: { password: problem } } : { ok: true, values: { password: password() } }
  })

  const error = () => {
    const problem = checks.problems().password
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
      auth.resetPassword({ newPassword: values.password, token: props.token }, options)
    )
    setPending(false)

    if (failed === undefined) {
      props.onReset()
    } else if (failed.code === 'PASSWORD_COMPROMISED') {
      breached.add(values.password)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <PasswordField
        label={t('resetPassword.password')}
        toggleLabel={t('auth.showPassword')}
        name="password"
        autocomplete="new-password"
        description={t('auth.newPasswordHint', passwordLength)}
        onChange={setPassword}
        error={error()}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
        {t('resetPassword.submit')}
      </Button>
      <Show when={failure()}>
        {(current) => {
          // Read once: the alert is new for every failure, and its link is made only once.
          const expired = current().code === 'INVALID_TOKEN'
          return (
            <AuthFailureAlert
              failure={current()}
              message={expired ? t('resetPassword.expired') : undefined}
              action={expired ? <Link href={props.askAgain}>{t('resetPassword.askAgain')}</Link> : undefined}
            />
          )
        }}
      </Show>
    </form>
  )
}
