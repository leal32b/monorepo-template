import type { OrganizationExport } from '@repo/contracts'
import { Button, buttonVariants, ListRow, useRowNote } from '@repo/ui'
import { createEffect, createSignal, type JSX, onCleanup, Show, Suspense } from 'solid-js'
import { exportFileUrl, organizationExportQuery, requestExport } from '#entities/organization-exports'
import { callApi, createRead, readAgain, updateRead, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate, formatDateTime, formatSize } from '#shared/lib'
import { ReadFailure } from '#shared/ui'

/** How often a pending export is read again while the page is open: a build takes seconds. */
const EXPORT_POLL_MS = 3_000

export type ExportDataRowProps = {
  organizationId: string
  /** The organization's time zone, which says its dates (ADR 0053). */
  timeZone: string
  /** While another panel of the screen is open, the request waits. */
  disabled?: boolean | undefined
}

/**
 * The owner's export of the organization's data (ADR 0074), one row: what it holds and the button to ask;
 * being prepared, read again every few seconds until it is ready, so nobody reloads; ready, until a day,
 * with its size and the download; expired, with the way to ask again. Within 15 minutes of the last request
 * the button waits, its note saying from when, and opens by itself then. A refusal for asking too soon
 * reads the state again, which says why.
 */
export function ExportDataRow(props: ExportDataRowProps) {
  const { t } = useI18n()
  // Its own boundary: the rest of the page never waits for the export's read, and a failure stays in the row.
  return (
    <ReadFailure message={t('organizationGeneral.export.unavailable')}>
      <Suspense fallback={<ListRow icon="folder" title={t('organizationGeneral.export.row')} description=" " />}>
        <ExportState {...props} />
      </Suspense>
    </ReadFailure>
  )
}

function ExportState(props: ExportDataRowProps) {
  const api = useApi()
  const { t, locale } = useI18n()
  const query = organizationExportQuery(api)
  const key = () => query.keyFor(props.organizationId)
  const state = createRead(() => query(props.organizationId), key)
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<string>()

  // A pending export is read again until the job has built it.
  createEffect(() => {
    if (state()?.status !== 'pending') return
    const timer = setInterval(() => readAgain(key()), EXPORT_POLL_MS)
    onCleanup(() => clearInterval(timer))
  })
  // The button opens by itself when the 15 minutes are over.
  createEffect(() => {
    const next = nextRequestAt(state())
    if (next === null) return
    const timer = setTimeout(() => readAgain(key()), Math.max(0, next.getTime() - Date.now()))
    onCleanup(() => clearTimeout(timer))
  })

  const request = async () => {
    setError(undefined)
    setPending(true)
    let asked: OrganizationExport | undefined
    const failed = await callApi(async () => {
      asked = await requestExport(api, props.organizationId)
    })
    setPending(false)
    if (asked !== undefined) {
      const done = asked
      return updateRead<OrganizationExport>(key(), () => done)
    }
    if (failed?.code === 'export_too_soon') return readAgain(key())
    setError(t('organizationGeneral.export.failed'))
  }

  const day = (instant: string) => formatDate(new Date(instant), locale(), props.timeZone)
  const description = (current: OrganizationExport) => {
    switch (current.status) {
      case 'none':
        return t('organizationGeneral.export.none')
      case 'pending':
        return t('organizationGeneral.export.pending')
      case 'ready':
        return t('organizationGeneral.export.ready', {
          date: day(current.expiresAt),
          size: formatSize(current.size, locale())
        })
      case 'expired':
        return t('organizationGeneral.export.expired', { date: day(current.expiresAt) })
    }
  }
  const note = () => {
    const next = nextRequestAt(state())
    return next === null || state()?.status === 'pending'
      ? undefined
      : t('organizationGeneral.export.again', { time: formatDateTime(next, props.timeZone, locale()) })
  }

  return (
    <Show when={state()}>
      {(current) => (
        <ListRow
          icon="folder"
          title={t('organizationGeneral.export.row')}
          description={description(current())}
          note={note()}
          error={error()}
          action={
            <Show when={current().status !== 'pending'}>
              <Show when={current().status === 'ready'}>
                <a
                  href={exportFileUrl(api, props.organizationId)}
                  download=""
                  class={buttonVariants({ variant: 'secondary' })}
                >
                  {t('organizationGeneral.export.download')}
                </a>
              </Show>
              <RequestButton
                variant={current().status === 'ready' ? 'outline' : 'secondary'}
                waiting={pending() || props.disabled === true}
                tooSoon={note() !== undefined}
                onClick={request}
              >
                {t(
                  current().status === 'ready'
                    ? 'organizationGeneral.export.requestAgain'
                    : 'organizationGeneral.export.request'
                )}
              </RequestButton>
            </Show>
          }
        />
      )}
    </Show>
  )
}

/** The request's button: disabled while it waits, and, too soon, pointing to the row's note, which says until when. */
function RequestButton(props: {
  variant: 'secondary' | 'outline'
  waiting: boolean
  tooSoon: boolean
  onClick: () => void
  children: JSX.Element
}) {
  const note = useRowNote()
  return (
    <Button
      variant={props.variant}
      disabled={props.waiting || props.tooSoon}
      aria-describedby={props.tooSoon ? note() : undefined}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  )
}

/** When the owner may ask again, while it is still to come. */
function nextRequestAt(state: OrganizationExport | undefined): Date | null {
  return state === undefined || state.status === 'none' || state.nextRequestAt === null
    ? null
    : new Date(state.nextRequestAt)
}
