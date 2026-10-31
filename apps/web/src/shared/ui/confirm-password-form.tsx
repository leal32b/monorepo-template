import { Button, PasswordField } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { AuthFailure } from '#shared/api'
import { useI18n } from '#shared/config'
import { type Checked, type CurrentPasswordProblem, createFormChecks, currentPasswordProblem } from '#shared/lib'
import { AuthFailureAlert } from './auth-failure-alert'

export type ConfirmPasswordFormProps = {
  /** The button's words: what the password confirms, such as "Set up". */
  submit: string
  /** Sends the password with the action it confirms, and returns what went wrong, if anything. */
  confirm: (password: string) => Promise<AuthFailure | undefined>
}

type Values = { password: string }

/**
 * Asks for the password before a change to how the account signs in, so a session left open is not
 * enough to make it. A wrong password is marked on the field and not sent again; anything else that
 * goes wrong shows below the button.
 */
export function ConfirmPasswordForm(props: ConfirmPasswordFormProps) {
  const { t } = useI18n()
  const [password, setPassword] = createSignal('')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const wrong = new Set<string>()
  const checks = createFormChecks((): Checked<Values, { password?: CurrentPasswordProblem }> => {
    const problem = currentPasswordProblem(password(), wrong)
    return problem ? { ok: false, problems: { password: problem } } : { ok: true, values: { password: password() } }
  })

  const error = () => {
    const problem = checks.problems().password
    return problem && t(`auth.errors.${problem}`)
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const values = checks.submit(form)
    if (values === undefined) return

    setPending(true)
    const failed = await props.confirm(values.password)
    setPending(false)

    if (failed?.code === 'INVALID_PASSWORD') {
      wrong.add(values.password)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <PasswordField
        label={t('confirmPassword.label')}
        toggleLabel={t('auth.showPassword')}
        name="password"
        autocomplete="current-password"
        description={t('confirmPassword.hint')}
        onChange={setPassword}
        error={error()}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full sm:w-auto sm:self-start" disabled={pending()}>
        {props.submit}
      </Button>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
    </form>
  )
}
