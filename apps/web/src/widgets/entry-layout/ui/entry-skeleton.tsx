import { Alert, createLate, motion } from '@repo/ui'
import { Show } from 'solid-js'
import { useI18n } from '#shared/config'

export type EntrySkeletonProps = {
  /**
   * What the brand's place holds: the app's name, or, on a page whose name is still to come (a tenant's
   * public page, ADR 0060), a placeholder of its size.
   */
  brand?: 'app' | 'pending' | undefined
}

/**
 * The frame of an entry screen, empty, for a slow wait (onboarding reading the invitations, an
 * invitation being read, a public page reading its organization): the brand, the title and the content
 * are where `EntryLayout` puts them, so the screen does not go from another frame to this one. It appears
 * only after a moment; when the wait gets long, it says why: the server may be waking up (ADR 0041).
 */
export function EntrySkeleton(props: EntrySkeletonProps) {
  const { t } = useI18n()
  const late = createLate()
  const slow = createLate(motion.slowWaitDelay)

  return (
    <Show when={late()}>
      <main aria-busy="true" class="mx-auto flex w-full max-w-sm flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <Show
          when={props.brand === 'pending'}
          fallback={<span class="self-start text-sm font-semibold tracking-tight">{t('app.name')}</span>}
        >
          <div aria-hidden="true" class="h-5 w-40 rounded-md bg-secondary" />
        </Show>
        <p role="status" class="sr-only">
          {t('appShell.loading')}
        </p>
        <div aria-hidden="true" class="flex flex-col gap-2">
          <div class="h-8 w-3/4 rounded-md bg-secondary" />
          <div class="h-5 w-full rounded-md bg-secondary" />
        </div>
        <div aria-hidden="true" class="h-11 w-full rounded-md bg-secondary sm:h-9" />
        <Show when={slow()}>
          <Alert variant="info">{t('appShell.slow')}</Alert>
        </Show>
      </main>
    </Show>
  )
}
