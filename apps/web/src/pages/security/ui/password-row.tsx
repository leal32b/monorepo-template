import { Badge, Button, SettingsRow } from '@repo/ui'
import { createSignal } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { ChangePasswordForm } from '#features/change-password'
import { SendPasswordLink } from '#features/request-password-reset'
import type { AuthFailure } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { Panel, type RowPanelProps } from './panel'

/**
 * The password: changed here behind a form, or, for an account made with Google alone, created by a
 * link sent to the account's own address. What happened is said in the row; the form leaves when done
 * and focus goes back to the button that opened it.
 */
export function PasswordRow(props: RowPanelProps & { security: AccountSecurity }) {
  const { t } = useI18n()
  const [status, setStatus] = createSignal<string>()
  const [failure, setFailure] = createSignal<AuthFailure>()
  let change: HTMLButtonElement | undefined

  const opened = () => props.open === 'password'
  const close = () => {
    props.onClose()
    queueMicrotask(() => change?.focus())
  }

  return (
    <SettingsRow
      icon="key"
      title={t('account.password.title')}
      badge={
        props.security.password ? (
          <Badge variant="success" dot>
            {t('account.badge.on')}
          </Badge>
        ) : (
          <Badge>{t('account.badge.notSetUp')}</Badge>
        )
      }
      description={props.security.password ? t('account.password.set') : t('account.password.unset')}
      status={status()}
      action={
        props.security.password ? (
          opened() ? undefined : (
            <Button
              ref={(button) => {
                change = button
              }}
              disabled={props.open !== undefined}
              onClick={() => {
                setStatus(undefined)
                props.onOpen('password')
              }}
            >
              {t('account.password.change')}
            </Button>
          )
        ) : (
          <SendPasswordLink
            email={props.security.email}
            onSent={() => {
              setFailure(undefined)
              setStatus(t('createPassword.sent', { email: props.security.email }))
            }}
            onFailure={(failed) => {
              setStatus(undefined)
              setFailure(failed)
            }}
          />
        )
      }
      panel={
        opened() ? (
          <Panel label={t('account.password.change')}>
            <p class="text-muted-foreground">{t('changePassword.signsOut')}</p>
            <ChangePasswordForm
              onChanged={() => {
                setStatus(t('changePassword.changed'))
                close()
              }}
              onCancel={close}
            />
          </Panel>
        ) : (
          failure() && <AuthFailureAlert failure={failure() as AuthFailure} />
        )
      }
    />
  )
}
