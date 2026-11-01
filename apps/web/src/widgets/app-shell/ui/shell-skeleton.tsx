import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { useI18n } from '#shared/config'

/** How long a session check may take before the frame is drawn: a quick one shows nothing at all. */
const delayMs = 300

/**
 * The frame of the shell, empty, for a slow wait on the session: the side menu and the top bar are
 * where they will be, so the page does not go from a blank screen to a full one. It appears only after a
 * moment, so someone who is about to be sent to sign in does not see a screen flash by.
 */
export function ShellSkeleton() {
  const { t } = useI18n()
  const [late, setLate] = createSignal(false)

  onMount(() => {
    const timer = setTimeout(() => setLate(true), delayMs)
    onCleanup(() => clearTimeout(timer))
  })

  return (
    <Show when={late()}>
      <div class="md:grid md:grid-cols-[16rem_minmax(0,1fr)]" aria-busy="true">
        <aside class="sticky top-0 hidden h-screen border-r border-border-subtle bg-surface md:block">
          <div class="flex h-14 items-center px-5 font-semibold tracking-tight">{t('app.name')}</div>
        </aside>
        <div class="min-w-0">
          <header class="sticky top-0 flex h-14 items-center border-b border-border-subtle bg-background px-3 md:px-6">
            <span class="font-semibold tracking-tight md:hidden">{t('app.name')}</span>
          </header>
          <p role="status" class="sr-only">
            {t('appShell.loading')}
          </p>
        </div>
      </div>
    </Show>
  )
}
