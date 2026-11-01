import { Badge, Button, SettingsRow, Stepper } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { DisableTwoFactor } from '#features/disable-two-factor'
import { EnableTwoFactor } from '#features/enable-two-factor'
import { useI18n } from '#shared/config'
import { BackupCodes } from './backup-codes'
import { Panel, type RowPanelProps } from './panel'

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
  let action: HTMLButtonElement | undefined

  const turned = (twoFactor: boolean) => props.onChange({ ...props.security, twoFactor })
  const close = () => {
    setStep(0)
    setCodes(undefined)
    props.onClose()
    queueMicrotask(() => action?.focus())
  }
  const open = (panel: 'turn-on' | 'turn-off') => {
    setStatus(undefined)
    props.onOpen(panel)
  }
  const done = (twoFactor: boolean) => {
    setStatus(twoFactor ? t('account.authenticator.enabled') : t('account.authenticator.disabled'))
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
        props.open === 'turn-on' ||
        props.open === 'turn-off' ||
        !(props.security.twoFactor || props.security.password) ? undefined : (
          <Button
            ref={(button) => {
              action = button
            }}
            variant={props.security.twoFactor ? 'outline' : 'secondary'}
            disabled={props.open !== undefined}
            onClick={() => open(props.security.twoFactor ? 'turn-off' : 'turn-on')}
          >
            {props.security.twoFactor ? t('account.authenticator.turnOff') : t('account.authenticator.turnOn')}
          </Button>
        )
      }
      panel={
        props.open === 'turn-on' ? (
          <Panel label={t('account.authenticator.stepper')}>
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
          </Panel>
        ) : props.open === 'turn-off' ? (
          <Panel label={t('account.authenticator.turnOff')}>
            <DisableTwoFactor
              onDisabled={() => {
                turned(false)
                done(false)
              }}
              onCancel={close}
            />
          </Panel>
        ) : undefined
      }
    />
  )
}
