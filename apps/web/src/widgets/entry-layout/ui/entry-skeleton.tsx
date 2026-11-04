import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { useI18n } from '#shared/config'

/** How long a load may take before the frame is drawn: a quick one shows nothing at all. */
const delayMs = 300

/**
 * The frame of an entry screen, empty, for a slow wait (onboarding reading the invitations, an
 * invitation being read): the brand, the title and the content are where `EntryLayout` puts them, so
 * the screen does not go from another frame to this one. It appears only after a moment.
 */
export function EntrySkeleton() {
  const { t } = useI18n()
  const [late, setLate] = createSignal(false)

  onMount(() => {
    const timer = setTimeout(() => setLate(true), delayMs)
    onCleanup(() => clearTimeout(timer))
  })

  return (
    <Show when={late()}>
      <main aria-busy="true" class="mx-auto flex w-full max-w-sm flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <span class="self-start text-sm font-semibold tracking-tight">{t('app.name')}</span>
        <p role="status" class="sr-only">
          {t('appShell.loading')}
        </p>
        <div aria-hidden="true" class="flex flex-col gap-2">
          <div class="h-8 w-3/4 rounded-md bg-secondary" />
          <div class="h-5 w-full rounded-md bg-secondary" />
        </div>
        <div aria-hidden="true" class="h-11 w-full rounded-md bg-secondary sm:h-9" />
      </main>
    </Show>
  )
}
