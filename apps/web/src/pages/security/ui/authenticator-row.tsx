import { Badge, PanelButton, SettingsPanel, SettingsRow, Stepper } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { DisableTwoFactor } from '#features/disable-two-factor'
import { EnableTwoFactor } from '#features/enable-two-factor'
import { useI18n } from '#shared/config'
import { BackupCodes } from './backup-codes'
import type { RowPanelProps } from './panel'

export type AuthenticatorRowProps = RowPanelProps & {
  security: AccountSecurity
  /** Called with the account's security once the second step changed. */
  onChange: (security: AccountSecurity) => void
}

/**
 * The second step with an authenticator app. Off, with a password, it is turned on in three steps:
 * confirm the password, connect the app (its first code proves the app holds the key), and save the
 * backup codes, which are shown once and have no way out until the user says they are saved. On, it
 * is turned off behind the password, after saying what is lost. What happened is said in the row.
 */
export function AuthenticatorRow(props: AuthenticatorRowProps) {
  const { t } = useI18n()
  const [status, setStatus] = createSignal<string>()
  const [step, setStep] = createSignal(0)
  const [codes, setCodes] = createSignal<string[]>()
  /** What the open panel does, fixed when it opens: turning on ends with the app on, the button now "Turn off". */
  const [turning, setTurning] = createSignal<'turn-on' | 'turn-off'>('turn-on')

  const turned = (twoFactor: boolean) => props.onChange({ ...props.security, twoFactor })
  const close = () => {
    setStep(0)
    setCodes(undefined)
    props.panels.close()
  }
  const opened = (panel: 'turn-on' | 'turn-off') => props.panels.isOpen('authenticator') && turning() === panel
  const done = (twoFactor: boolean) => {
    setStatus(twoFactor ? t('account.authenticator.enabledDone') : t('account.authenticator.disabled'))
    close()
  }
  const elsewhere = (twoFactor: boolean) => {
    turned(twoFactor)
    done(twoFactor)
  }

  return (
    <SettingsRow
      icon="phone"
      title={t('account.authenticator.title')}
      badge={
        props.security.twoFactor ? (
          <Badge variant="success" dot>
            {t('account.badge.on')}
          </Badge>
        ) : (
          <Badge>{props.security.password ? t('account.badge.off') : t('account.badge.notSetUp')}</Badge>
        )
      }
      description={
        props.security.twoFactor
          ? t('account.authenticator.on')
          : props.security.password
            ? t('account.authenticator.off')
            : t('account.authenticator.needsPassword')
      }
      status={status()}
      action={
        props.security.twoFactor || props.security.password ? (
          <PanelButton
            panels={props.panels}
            panel="authenticator"
            onOpen={() => {
              setStatus(undefined)
              setTurning(props.security.twoFactor ? 'turn-off' : 'turn-on')
            }}
          >
            {props.security.twoFactor ? t('account.authenticator.turnOff') : t('account.authenticator.turnOn')}
          </PanelButton>
        ) : undefined
      }
      panel={
        opened('turn-on') ? (
          <SettingsPanel label={t('account.authenticator.stepper')}>
            <Stepper
              aria-label={t('account.authenticator.stepper')}
              steps={[
                t('account.authenticator.steps.confirm'),
                t('account.authenticator.steps.connect'),
                t('account.authenticator.steps.save')
              ]}
              current={step()}
              doneLabel={t('account.authenticator.done')}
            />
            <Show
              when={codes()}
              fallback={
                <EnableTwoFactor
                  onSetup={() => setStep(1)}
                  onEnabled={(backupCodes) => {
                    turned(true)
                    setCodes(backupCodes)
                    setStep(2)
                  }}
                  onAlreadyOn={() => elsewhere(true)}
                  onCancel={close}
                />
              }
            >
              {(shown) => (
                <BackupCodes
                  codes={shown()}
                  email={props.security.email}
                  message={t('account.authenticator.enabled')}
                  onSaved={() => done(true)}
                />
              )}
            </Show>
          </SettingsPanel>
        ) : opened('turn-off') ? (
          <SettingsPanel label={t('account.authenticator.turnOff')}>
            <DisableTwoFactor
              onDisabled={() => {
                turned(false)
                done(false)
              }}
              onCancel={close}
            />
          </SettingsPanel>
        ) : undefined
      }
    />
  )
}
