import { Button, buttonVariants, cn, Icon, Popover } from '@repo/ui'
import { Show } from 'solid-js'
import { isProblem, type ServiceState, type ServiceStatus } from '#entities/health'
import { useI18n } from '#shared/config'

/** The colour of the dot on the status icon: state is also said in words, the dot only helps. */
const dotClass: Record<ServiceState, string> = {
  checking: 'bg-muted-foreground',
  ok: 'bg-success',
  degraded: 'bg-warning',
  unreachable: 'bg-destructive',
  unexpected: 'bg-destructive',
  error: 'bg-destructive'
}

/**
 * The line that says a problem where the user will see it, above the account, so they know before
 * they try. Nothing when all is well: the icon alone stays (`ServiceStatusButton`).
 */
export function ServiceProblem(props: { status: ServiceStatus }) {
  const { t } = useI18n()

  return (
    <Show when={isProblem(props.status.state())}>
      <p
        role="status"
        class={cn('px-2 text-sm', props.status.state() === 'degraded' ? 'text-warning' : 'text-destructive')}
      >
        {t(`appShell.status.state.${props.status.state()}`)}
      </p>
    </Show>
  )
}

/**
 * The status icon and what it opens: the state in words, when it was checked, the reference to quote
 * to support if the API answered an error, and a way to check again.
 */
export function ServiceStatusButton(props: { status: ServiceStatus }) {
  const { t, locale } = useI18n()
  const message = () => t(`appShell.status.state.${props.status.state()}`)
  const checkedAt = () => {
    const at = props.status.checkedAt()
    return at === undefined
      ? undefined
      : new Intl.DateTimeFormat(locale(), { timeStyle: 'medium' }).format(new Date(at))
  }

  return (
    <Popover
      trigger={
        <>
          <Icon name="activity" />
          <span
            aria-hidden="true"
            class={cn('absolute top-2 right-2 size-2 rounded-full ring-2 ring-surface', dotClass[props.status.state()])}
          />
        </>
      }
      triggerClass={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative shrink-0 text-muted-foreground')}
      triggerLabel={t('appShell.status.button', { state: message() })}
      title={t('appShell.status.title')}
      closeLabel={t('appShell.status.close')}
      placement="top-end"
    >
      <p role="status">{message()}</p>
      <Show when={checkedAt()}>
        {(time) => <p class="text-muted-foreground">{t('appShell.status.checkedAt', { time: time() })}</p>}
      </Show>
      <Show when={props.status.reference()}>
        {(reference) => (
          <p class="text-muted-foreground">{t('appShell.status.reference', { reference: reference() })}</p>
        )}
      </Show>
      <Button size="sm" disabled={props.status.state() === 'checking'} onClick={props.status.check}>
        {t('appShell.status.checkAgain')}
      </Button>
    </Popover>
  )
}
