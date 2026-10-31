import { createSignal, Show } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { EnableTwoFactor } from '#features/enable-two-factor'
import { useI18n } from '#shared/config'
import { BackupCodes } from './backup-codes'
import { Section } from './section'
import { TwoFactorActions } from './two-factor-actions'

export type TwoFactorSectionProps = {
  security: AccountSecurity
  /** Called with the account's security once the second step changed. */
  onChange: (security: AccountSecurity) => void
}

/**
 * The second step: whether it is on, then what can be done about it. Off, with a password, it is
 * turned on with an authenticator app; on, it gives new backup codes or is turned off. Backup codes
 * are shown once, until the user says they are saved. Once a form is done and goes away, focus moves
 * to the state, so the keyboard and screen readers go on from what changed.
 */
export function TwoFactorSection(props: TwoFactorSectionProps) {
  const { t } = useI18n()
  const [newCodes, setNewCodes] = createSignal<{ codes: string[]; message: string }>()
  let state!: HTMLParagraphElement

  const turned = (twoFactor: boolean) => props.onChange({ ...props.security, twoFactor })
  const turnedElsewhere = (twoFactor: boolean) => {
    turned(twoFactor)
    state.focus()
  }

  return (
    <Section id="two-factor" title={t('account.twoFactor.title')}>
      <p
        ref={(element) => {
          state = element
        }}
        tabIndex={-1}
        class="outline-none"
      >
        {props.security.twoFactor
          ? t('account.twoFactor.on')
          : props.security.password
            ? t('account.twoFactor.off')
            : t('account.twoFactor.needsPassword')}
      </p>
      <Show when={newCodes()}>
        {(shown) => (
          <BackupCodes
            codes={shown().codes}
            email={props.security.email}
            message={shown().message}
            onSaved={() => {
              setNewCodes(undefined)
              state.focus()
            }}
          />
        )}
      </Show>
      <Show when={props.security.password && !props.security.twoFactor}>
        <p class="text-muted-foreground">{t('account.twoFactor.why')}</p>
        <EnableTwoFactor
          onEnabled={(codes) => {
            setNewCodes({ codes, message: t('account.twoFactor.enabled') })
            turned(true)
          }}
          onAlreadyOn={() => turnedElsewhere(true)}
        />
      </Show>
      <Show when={props.security.twoFactor && !newCodes()}>
        <TwoFactorActions
          onRegenerated={(codes) => setNewCodes({ codes, message: t('account.twoFactor.regenerated') })}
          onDisabled={() => turnedElsewhere(false)}
          onAlreadyOff={() => turnedElsewhere(false)}
        />
      </Show>
    </Section>
  )
}
