import { PanelButton, SettingsPanel, SettingsRow } from '@repo/ui'
import { createSignal } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { RegenerateBackupCodes } from '#features/regenerate-backup-codes'
import { useI18n } from '#shared/config'
import { BackupCodes } from './backup-codes'
import type { RowPanelProps } from './panel'

export type BackupCodesRowProps = RowPanelProps & {
  security: AccountSecurity
  /** Called with the account's security when the second step turns out to be off. */
  onChange: (security: AccountSecurity) => void
}

/**
 * Backup codes, for when the app is out of reach. Only there while the second step is on. New codes
 * are asked behind the password, after saying the old ones stop working; they are shown once, with
 * no way out until the user says they are saved.
 */
export function BackupCodesRow(props: BackupCodesRowProps) {
  const { t } = useI18n()
  const [codes, setCodes] = createSignal<string[]>()
  const opened = () => props.panels.isOpen('new-codes')
  const close = () => {
    setCodes(undefined)
    props.panels.close()
  }

  return (
    <SettingsRow
      icon="list"
      title={t('account.backupCodes.title')}
      description={
        props.security.twoFactor ? t('account.backupCodes.description') : t('account.backupCodes.unavailable')
      }
      action={
        props.security.twoFactor ? (
          <PanelButton panels={props.panels} panel="new-codes">
            {t('account.backupCodes.newCodes')}
          </PanelButton>
        ) : undefined
      }
      panel={
        opened() ? (
          <SettingsPanel label={t('account.backupCodes.newCodes')}>
            {codes() ? (
              <BackupCodes
                codes={codes() as string[]}
                email={props.security.email}
                message={t('account.backupCodes.regenerated')}
                onSaved={close}
              />
            ) : (
              <RegenerateBackupCodes
                onRegenerated={setCodes}
                onAlreadyOff={() => {
                  props.onChange({ ...props.security, twoFactor: false })
                  close()
                }}
                onCancel={close}
              />
            )}
          </SettingsPanel>
        ) : undefined
      }
    />
  )
}
