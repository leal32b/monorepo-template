import { Alert, Button, Field } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { cleanEmail, createFormChecks } from '#shared/lib'
import { AuthFailureAlert, OpenMail } from '#shared/ui'

/**
 * Asks for a link to choose a new password. The API answers the same whether or not the address has
 * an account (T08), so the screen says the link went out if there is one; it stays on the form, so
 * the user can fix the address or ask again (the API allows 3 a minute). It starts from `email`, the
 * one typed at the sign-in, when there is one.
 */
export function RequestResetForm(props: { email?: string | undefined }) {
  const auth = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = createSignal(props.email ?? '')
  const [sentTo, setSentTo] = createSignal<string>()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const checks = createFormChecks(() => {
    const address = cleanEmail(email())
    return address === undefined
      ? { ok: false, problems: { email: 'emailInvalid' as const } }
      : { ok: true, values: { email: address } }
  })

  const error = () => {
    const problem = checks.problems().email
    return problem && t(`auth.errors.${problem}`)
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    setSentTo(undefined)
    setFailure(undefined)
    const values = checks.submit(event.currentTarget)
    if (values === undefined) return

    setPending(true)
    const failed = await callAuth((options) =>
      auth.requestPasswordReset({ ...values, redirectTo: '/reset-password' }, options)
    )
    setPending(false)
    if (failed === undefined) setSentTo(values.email)
    else setFailure(failed)
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t('auth.email')}
        name="email"
        type="email"
        autocomplete="username"
        value={email()}
        onChange={setEmail}
        error={error()}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
        {t('forgotPassword.submit')}
      </Button>
      <Show when={sentTo()}>
        {(address) => (
          <>
            <Alert variant="success" class="break-words">
              {t('forgotPassword.sent', { email: address() })}
            </Alert>
            <OpenMail email={address()} variant="outline" />
          </>
        )}
      </Show>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
    </form>
  )
}
