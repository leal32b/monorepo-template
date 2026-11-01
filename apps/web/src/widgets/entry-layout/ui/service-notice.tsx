import { Alert } from '@repo/ui'
import { Show } from 'solid-js'
import { createServiceStatus, isProblem } from '#entities/health'
import { useI18n } from '#shared/config'

/**
 * Tells the user, before they try, that the service is down or struggling, so a failed sign-in is not
 * taken for a wrong password; announced politely, since it comes with the page. Nothing shows while all is well or while it is being checked. It sits
 * below the form, where the answers to the form appear, so nothing above it moves when it does.
 */
export function ServiceNotice() {
  const { t } = useI18n()
  const status = createServiceStatus()

  return (
    <Show when={isProblem(status.state())}>
      <Alert variant="warning" title={t('serviceNotice.title')}>
        {t(`appShell.status.state.${status.state()}`)}. {t('serviceNotice.hint')}
      </Alert>
    </Show>
  )
}
