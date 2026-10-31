import { callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { ConfirmPasswordForm } from '#shared/ui'

export type DisableTwoFactorProps = {
  /** Called once it is off. */
  onDisabled: () => void
}

/**
 * Turns off two-step verification, behind the password, after saying what that changes. Better Auth
 * deletes the app's key and the backup codes, and forgets the devices that skipped the second step.
 */
export function DisableTwoFactor(props: DisableTwoFactorProps) {
  const auth = useAuth()
  const { t } = useI18n()

  const disable = async (password: string) => {
    const failed = await callAuth((options) => auth.twoFactor.disable({ password }, options))
    if (failed === undefined) props.onDisabled()
    return failed
  }

  return (
    <div class="flex flex-col gap-4">
      <p class="text-muted-foreground">{t('disableTwoFactor.what')}</p>
      <ConfirmPasswordForm submit={t('disableTwoFactor.submit')} variant="destructive" confirm={disable} />
    </div>
  )
}
