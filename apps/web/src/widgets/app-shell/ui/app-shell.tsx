import { Sheet } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { createSignal, onMount, type ParentProps, Show } from 'solid-js'
import { createSignOut } from '#features/sign-out'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { createServiceStatus } from '../model/service-status'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'

/**
 * The frame every app screen shares: the side menu (a drawer on phones), a sticky top bar with where
 * you are, and the screen's title and content in one column, mobile first. Focus moves to the title
 * when the screen opens; a failed sign-out shows below it.
 */
export function AppShell(props: ParentProps<{ title: string }>) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const signOut = createSignOut(() => navigate('/login', { replace: true }))
  const status = createServiceStatus()
  const [drawerOpen, setDrawerOpen] = createSignal(false)

  const sidebar = (onNavigate?: () => void) => (
    <Sidebar status={status} signOut={signOut.signOut} onNavigate={onNavigate} />
  )

  return (
    <div class="md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside class="sticky top-0 hidden h-screen border-r border-border-subtle md:block">{sidebar()}</aside>
      <Sheet
        open={drawerOpen()}
        onOpenChange={setDrawerOpen}
        title={t('appShell.menu')}
        closeLabel={t('appShell.closeMenu')}
      >
        {sidebar(() => setDrawerOpen(false))}
      </Sheet>
      <div class="min-w-0">
        <TopBar title={props.title} onOpenMenu={() => setDrawerOpen(true)} />
        <main class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-8 sm:px-6 md:pt-8 md:pb-12">
          <h1
            ref={(heading) => onMount(() => heading.focus())}
            tabIndex={-1}
            class="text-2xl font-semibold tracking-tight outline-none"
          >
            {props.title}
          </h1>
          <Show when={signOut.failure()}>{(failure) => <AuthFailureAlert failure={failure()} />}</Show>
          {props.children}
        </main>
      </div>
    </div>
  )
}
