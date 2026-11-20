import type { Impersonation } from '@repo/contracts'
import { Alert, Button } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { createEffect, createSignal, onCleanup, Show } from 'solid-js'
import { leaveImpersonation, useImpersonation } from '#entities/operators'
import { useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDateTime } from '#shared/lib'

/**
 * Says, above every screen, that an operator is inside an organization as its owner sees it, read only, and
 * until when (ADR 0077), with the way out. At its end the visit is over on its own: the operator goes back to
 * the organization's page in the back office, as when they leave. Drawn by the app's frame and the back office's.
 */
export function ImpersonationBanner() {
  const { current } = useImpersonation()
  return <Show when={current()}>{(visit) => <Banner visit={visit()} />}</Show>
}

function Banner(props: { visit: Impersonation }) {
  const { t, locale } = useI18n()
  const api = useApi()
  const navigate = useNavigate()
  const { set } = useImpersonation()
  const [pending, setPending] = createSignal(false)
  const [failed, setFailed] = createSignal(false)
  const ended = (organizationId: string) => {
    set(null)
    navigate(`/admin/organizations/${encodeURIComponent(organizationId)}`)
  }

  createEffect(() => {
    const { organization, endsAt } = props.visit
    const timer = setTimeout(() => ended(organization.id), Date.parse(endsAt) - Date.now())
    onCleanup(() => clearTimeout(timer))
  })

  const leave = (organizationId: string) => {
    setPending(true)
    setFailed(false)
    leaveImpersonation(api).then(
      () => ended(organizationId),
      () => {
        setPending(false)
        setFailed(true)
      }
    )
  }

  return (
    <Alert
      variant="warning"
      class="rounded-none border-x-0 border-t-0"
      title={t('impersonation.title', { name: props.visit.organization.name })}
      action={
        <Button variant="secondary" disabled={pending()} onClick={() => leave(props.visit.organization.id)}>
          {t('impersonation.leave')}
        </Button>
      }
    >
      {failed()
        ? t('impersonation.leaveFailed')
        : t('impersonation.description', {
            time: formatDateTime(
              new Date(props.visit.endsAt),
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              locale()
            )
          })}
    </Alert>
  )
}
