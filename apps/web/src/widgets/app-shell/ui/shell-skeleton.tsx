import { Alert, createLate, motion } from '@repo/ui'
import { For, Show } from 'solid-js'
import { useI18n } from '#shared/config'
import { PageSkeleton } from './page-skeleton'
import { tabBarRoom } from './screen-class'

/** About as many places as the side menu usually has items. */
const menuPlaces = 4

/** As many places as the tab bar has tabs with no more than the template's screens: Home, Customers, Search, You. */
const tabPlaces = 4

/** The place of a menu's trigger: its mark, square for the organization and round for the person, and its name. */
function TriggerPlace(props: { round?: boolean }) {
  return (
    <div class="flex items-center gap-2.5 px-2">
      <div class={`size-8 shrink-0 bg-secondary ${props.round ? 'rounded-full' : 'rounded-md'}`} />
      <div class="h-4 w-28 rounded-md bg-secondary" />
    </div>
  )
}

/**
 * The frame of the shell, with the places of its parts and of the page, for a slow wait on the session: from
 * `md` the side menu (the organization's menu, the search, the screens, the person's menu at its foot), below
 * it the top row and the tab bar, each where it will be (ADR 0080), so the page does not go from a blank
 * screen to a full one, and the bars read as loading, not as broken. It appears only after a moment, so
 * someone who is about to be sent to sign in does not see a screen flash by. When the wait gets long, it says
 * why: the server may be waking up, which takes up to a minute (ADR 0041).
 */
export function ShellSkeleton() {
  const { t } = useI18n()
  const late = createLate()
  const slow = createLate(motion.slowWaitDelay)

  return (
    <Show when={late()}>
      <div class={`md:grid md:grid-cols-[16rem_minmax(0,1fr)] ${tabBarRoom}`} aria-busy="true">
        <aside class="sticky top-0 hidden h-screen flex-col gap-4 border-r border-border-subtle bg-surface p-3 md:flex">
          <div class="-mx-3 -mt-3 flex h-14 shrink-0 items-center px-3">
            <TriggerPlace />
          </div>
          <div aria-hidden="true" class="flex flex-1 flex-col gap-5 px-2 pt-2">
            <div class="h-5 w-40 rounded-md bg-secondary" />
            <nav class="flex flex-col gap-4">
              <For each={Array.from({ length: menuPlaces })}>
                {() => <div class="h-5 w-32 rounded-md bg-secondary" />}
              </For>
            </nav>
          </div>
          <div class="border-t border-border-subtle pt-3">
            <TriggerPlace round />
          </div>
        </aside>
        <header class="sticky top-0 flex h-14 items-center border-b border-border-subtle bg-background px-3 md:hidden">
          <TriggerPlace />
        </header>
        <div class="min-w-0">
          <PageSkeleton />
          <Show when={slow()}>
            <div class="mx-auto w-full max-w-3xl px-4 pb-8 sm:px-6">
              <Alert variant="info">{t('appShell.slow')}</Alert>
            </div>
          </Show>
        </div>
        <div class="fixed inset-x-0 bottom-0 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-flow-col auto-cols-fr border-t border-border-subtle bg-background px-2 pt-3 pb-[env(safe-area-inset-bottom)] md:hidden">
          <For each={Array.from({ length: tabPlaces })}>
            {() => (
              <div class="flex flex-col items-center gap-1.5">
                <div class="size-6 rounded-md bg-secondary" />
                <div class="h-2.5 w-10 rounded-md bg-secondary" />
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}
