import { Button, Field, Link, QrCode } from '@repo/ui'
import { createSignal, onMount, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks, validateCode } from '#shared/lib'
import { AuthFailureAlert, ConfirmPasswordForm } from '#shared/ui'
import { type TotpSetup, totpSetupOf } from '../model/totp-setup'

export type EnableTwoFactorProps = {
  /** Called once the app's first code is right, with the backup codes to show the user, once. */
  onEnabled: (backupCodes: string[]) => void
  /** Called when it was turned on elsewhere meanwhile, such as in another tab. */
  onAlreadyOn: () => void
  /** Called once the password is right and the app's setup is on screen: the second step of three. */
  onSetup: () => void
  /** Gives the user a way out, before the app's first code is right. */
  onCancel: () => void
}

/**
 * Turns on two-step verification with an authenticator app. The password first; then the app's setup
 * (a QR code, a link that opens the app on this phone, or the key to type) and the app's first code,
 * which proves the app holds the key. Only then is the second step on (T11).
 */
export function EnableTwoFactor(props: EnableTwoFactorProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [setup, setSetup] = createSignal<TotpSetup>()

  const start = async (password: string) => {
    const failed = await callAuth((options) =>
      auth.twoFactor.enable(
        { password },
        {
          ...options,
          onSuccess: ({ data }) => {
            const current = totpSetupOf(data)
            setSetup(current)
            if (current) props.onSetup()
          }
        }
      )
    )
    if (failed?.code !== 'TOTP_ALREADY_ENABLED') return failed
    props.onAlreadyOn()
    return undefined
  }

  return (
    <Show
      when={setup()}
      fallback={<ConfirmPasswordForm submit={t('enableTwoFactor.setUp')} confirm={start} onCancel={props.onCancel} />}
    >
      {(current) => (
        <ConfirmApp
          setup={current()}
          onVerified={() => props.onEnabled(current().backupCodes)}
          onCancel={props.onCancel}
        />
      )}
    </Show>
  )
}

/**
 * The app's setup and its first code. A wrong code is marked on the field and not sent again; it does
 * not count towards the sign-in lock, but the route is rate limited.
 */
function ConfirmApp(props: { setup: TotpSetup; onVerified: () => void; onCancel: () => void }) {
  const auth = useAuth()
  const { t } = useI18n()
  const [code, setCode] = createSignal('')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const rejected = new Set<string>()
  const checks = createFormChecks(() => validateCode({ code: code() }, rejected))

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
    const failed = await callAuth((options) => auth.twoFactor.verifyTotp(values, options))
    setPending(false)

    if (failed === undefined) {
      props.onVerified()
    } else if (failed.code === 'INVALID_CODE') {
      rejected.add(values.code)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <div class="flex flex-col gap-4">
      <p tabIndex={-1} ref={(text) => onMount(() => text.focus())} class="outline-none">
        {t('enableTwoFactor.scan')}
      </p>
      <QrCode value={props.setup.uri} label={t('enableTwoFactor.qr')} />
      <p class="text-sm text-muted-foreground">
        {t('enableTwoFactor.onThisPhone')} <Link href={props.setup.uri}>{t('enableTwoFactor.openApp')}</Link>
      </p>
      <div class="flex flex-col gap-1.5">
        <p class="text-sm text-muted-foreground">{t('enableTwoFactor.key')}</p>
        <code class="select-all break-words font-mono">{props.setup.key}</code>
      </div>
      <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
        <Field
          label={t('twoFactor.app.code')}
          name="code"
          inputmode="numeric"
          autocomplete="off"
          onChange={setCode}
          error={error()}
        />
        <div class="mt-2 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" variant="primary" class="w-full sm:w-auto" disabled={pending()}>
            {t('enableTwoFactor.turnOn')}
          </Button>
          <Button variant="ghost" class="w-full sm:w-auto" onClick={props.onCancel}>
            {t('actions.cancel')}
          </Button>
        </div>
        <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
      </form>
    </div>
  )
}
