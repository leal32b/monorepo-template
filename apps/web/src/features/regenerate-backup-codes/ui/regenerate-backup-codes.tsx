import { callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { ConfirmPasswordForm } from '#shared/ui'

export type RegenerateBackupCodesProps = {
  /** Called with the new codes, to show the user once; the old ones no longer work. */
  onRegenerated: (backupCodes: string[]) => void
  /** Called when the second step was turned off elsewhere meanwhile, such as in another tab. */
  onAlreadyOff: () => void
}

/**
 * Gets new backup codes, behind the password, for codes that were used up, lost or seen by someone
 * else. The new ones replace the old ones, which stop working at once.
 */
export function RegenerateBackupCodes(props: RegenerateBackupCodesProps) {
  const auth = useAuth()
  const { t } = useI18n()

  const regenerate = async (password: string) => {
    const failed = await callAuth((options) =>
      auth.twoFactor.generateBackupCodes(
        { password },
        {
          ...options,
          onSuccess: ({ data }) => {
            props.onRegenerated(data.backupCodes)
          }
        }
      )
    )
    if (failed?.code !== 'TWO_FACTOR_NOT_ENABLED') return failed
    props.onAlreadyOff()
    return undefined
  }

  return (
    <div class="flex flex-col gap-4">
      <p class="text-muted-foreground">{t('regenerateBackupCodes.what')}</p>
      <ConfirmPasswordForm submit={t('regenerateBackupCodes.submit')} confirm={regenerate} />
    </div>
  )
}
