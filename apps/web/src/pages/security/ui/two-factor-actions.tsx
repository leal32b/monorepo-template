import { Button } from '@repo/ui'
import { createSignal, Match, Switch } from 'solid-js'
import { DisableTwoFactor } from '#features/disable-two-factor'
import { RegenerateBackupCodes } from '#features/regenerate-backup-codes'
import { useI18n } from '#shared/config'

type Action = 'codes' | 'off'

export type TwoFactorActionsProps = {
  onRegenerated: (backupCodes: string[]) => void
  onDisabled: () => void
  onAlreadyOff: () => void
}

/**
 * What can be done while the second step is on, each behind the password: new backup codes, or
 * turning it off. Each button opens its form below the buttons, and closes it again, so nothing the
 * user is looking at moves.
 */
export function TwoFactorActions(props: TwoFactorActionsProps) {
  const { t } = useI18n()
  const [open, setOpen] = createSignal<Action>()
  const toggle = (action: Action) => setOpen((current) => (current === action ? undefined : action))

  return (
    <>
      <div class="flex flex-col gap-2 sm:flex-row">
        <Button aria-expanded={open() === 'codes'} aria-controls="two-factor-action" onClick={() => toggle('codes')}>
          {t('account.twoFactor.newCodes')}
        </Button>
        <Button
          variant="outline"
          aria-expanded={open() === 'off'}
          aria-controls="two-factor-action"
          onClick={() => toggle('off')}
        >
          {t('account.twoFactor.turnOff')}
        </Button>
      </div>
      <div id="two-factor-action">
        <Switch>
          <Match when={open() === 'codes'}>
            <RegenerateBackupCodes onRegenerated={props.onRegenerated} onAlreadyOff={props.onAlreadyOff} />
          </Match>
          <Match when={open() === 'off'}>
            <DisableTwoFactor onDisabled={props.onDisabled} />
          </Match>
        </Switch>
      </div>
    </>
  )
}
