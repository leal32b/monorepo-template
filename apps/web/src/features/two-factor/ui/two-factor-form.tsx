import { Button, Field, Link } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks, validateBackupCode, validateCode } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'

export type TwoFactorFormProps = {
  /** Which code is asked for: the one the authenticator app shows, or one of the saved backup codes. */
  method: 'app' | 'backup'
  /** Called once the code is right and the user is signed in. */
  onVerified: () => void
  /** The sign-in page, for when the challenge expired or the account is locked for a while. */
  signInAgain: string
}

/** The challenge failures this screen has its own words for; both end with signing in again. */
const ended = new Map<string | undefined, 'expired' | 'locked'>([
  ['INVALID_TWO_FACTOR_COOKIE', 'expired'],
  ['ACCOUNT_TEMPORARILY_LOCKED', 'locked']
])

/**
 * The second step of a sign-in: the code of the authenticator app, typed on the number pad or filled
 * in by the phone, or a backup code, kept as typed. A wrong code is marked on the field and not sent
 * again; anything else that goes wrong shows below the button.
 */
export function TwoFactorForm(props: TwoFactorFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [code, setCode] = createSignal('')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const rejected = new Set<string>()
  const validate = props.method === 'app' ? validateCode : validateBackupCode
  const checks = createFormChecks(() => validate({ code: code() }, rejected))

  const error = () => {
    const problem = checks.problems().code
    return problem && t(`twoFactor.errors.${problem}`)
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const values = checks.submit(form)
    if (values === undefined) return

    setPending(true)
    const failed = await callAuth((options) =>
      props.method === 'app'
        ? auth.twoFactor.verifyTotp(values, options)
        : auth.twoFactor.verifyBackupCode(values, options)
    )
    setPending(false)

    if (failed === undefined) {
      props.onVerified()
    } else if (failed.code === 'INVALID_CODE' || failed.code === 'INVALID_BACKUP_CODE') {
      rejected.add(values.code)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t(`twoFactor.${props.method}.code`)}
        name="code"
        inputmode={props.method === 'app' ? 'numeric' : undefined}
        autocomplete={props.method === 'app' ? 'one-time-code' : 'off'}
        autocapitalize="off"
        spellcheck={false}
        onChange={setCode}
        error={error()}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
        {t('twoFactor.submit')}
      </Button>
      <Show when={failure()}>
        {(current) => {
          // Read once: the alert is new for every failure, and its link is made only once.
          const words = ended.get(current().code)
          return (
            <AuthFailureAlert
              failure={current()}
              message={words && t(`twoFactor.errors.${words}`)}
              action={words && <Link href={props.signInAgain}>{t('twoFactor.signInAgain')}</Link>}
            />
          )
        }}
      </Show>
    </form>
  )
}
