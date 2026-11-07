import { Alert, createLate, motion } from '@repo/ui'
import { For, Show } from 'solid-js'
import { useI18n } from '#shared/config'
import { PageSkeleton } from './page-skeleton'

/** About as many places as the side menu usually has items. */
const menuPlaces = 4

/**
 * The frame of the shell, with the places of its menu and of the page, for a slow wait on the session: the
 * side menu and the top bar are where they will be, so the page does not go from a blank screen to a full
 * one, and the bars read as loading, not as broken. It appears only after a moment, so someone who is about
 * to be sent to sign in does not see a screen flash by. When the wait gets long, it says why: the server
 * may be waking up, which takes up to a minute (ADR 0041).
 */
export function ShellSkeleton() {
  const { t } = useI18n()
  const late = createLate()
  const slow = createLate(motion.slowWaitDelay)

  return (
    <Show when={late()}>
      <div class="md:grid md:grid-cols-[16rem_minmax(0,1fr)]" aria-busy="true">
        <aside class="sticky top-0 hidden h-screen border-r border-border-subtle bg-surface md:block">
          <div class="flex h-14 items-center px-5 font-semibold tracking-tight">{t('app.name')}</div>
          <div aria-hidden="true" class="flex flex-col gap-3 px-5 pt-2">
            <For each={Array.from({ length: menuPlaces })}>
              {() => <div class="h-5 w-32 rounded-md bg-secondary" />}
            </For>
          </div>
        </aside>
        <div class="min-w-0">
          <header class="sticky top-0 flex h-14 items-center border-b border-border-subtle bg-background px-3 md:px-6">
            <span class="font-semibold tracking-tight md:hidden">{t('app.name')}</span>
          </header>
          <PageSkeleton />
          <Show when={slow()}>
            <div class="mx-auto w-full max-w-3xl px-4 pb-8 sm:px-6">
              <Alert variant="info">{t('appShell.slow')}</Alert>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
