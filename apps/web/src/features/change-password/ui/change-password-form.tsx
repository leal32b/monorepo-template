import { passwordLength } from '@repo/contracts'
import { Button, PasswordField } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { type ChangePasswordValues, validateChangePassword } from '../model/validate-change-password'

export type ChangePasswordFormProps = {
  /** Called once the password is changed, to say so where the user acted. */
  onChanged: () => void
  /** Gives the user a way out: a Cancel button beside the action. */
  onCancel?: (() => void) | undefined
}

/**
 * Changes the password: the current one, then a new one by the sign-up's rules. Every other device is
 * signed out (T10); this one stays in. A wrong current password, or a new one found in a data breach,
 * is marked on its field.
 */
export function ChangePasswordForm(props: ChangePasswordFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [current, setCurrent] = createSignal('')
  const [next, setNext] = createSignal('')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const refused = { wrong: new Set<string>(), breached: new Set<string>() }
  const checks = createFormChecks(() => validateChangePassword({ current: current(), next: next() }, refused))

  const errorOf = (field: keyof ChangePasswordValues) => {
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
      auth.changePassword(
        { currentPassword: values.current, newPassword: values.next, revokeOtherSessions: true },
        options
      )
    )
    setPending(false)

    if (failed === undefined) {
      props.onChanged()
    } else if (failed.code === 'INVALID_PASSWORD') {
      refused.wrong.add(values.current)
      checks.submit(form)
    } else if (failed.code === 'PASSWORD_COMPROMISED') {
      refused.breached.add(values.next)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <PasswordField
        label={t('changePassword.current')}
        toggleLabel={t('auth.showPassword')}
        name="current-password"
        autocomplete="current-password"
        value={current()}
        onChange={setCurrent}
        error={errorOf('current')}
      />
      <PasswordField
        label={t('changePassword.next')}
        toggleLabel={t('auth.showPassword')}
        name="new-password"
        autocomplete="new-password"
        description={t('auth.newPasswordHint', passwordLength)}
        value={next()}
        onChange={setNext}
        error={errorOf('next')}
      />
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" class="w-full sm:w-auto" disabled={pending()}>
          {t('changePassword.submit')}
        </Button>
        <Show when={props.onCancel}>
          {(cancel) => (
            <Button variant="ghost" class="w-full sm:w-auto" onClick={() => cancel()()}>
              {t('actions.cancel')}
            </Button>
          )}
        </Show>
      </div>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
    </form>
  )
}
