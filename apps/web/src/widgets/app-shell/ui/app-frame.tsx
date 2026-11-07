import { Sheet } from '@repo/ui'
import { useLocation, useNavigate } from '@solidjs/router'
import { createEffect, createSignal, on, type ParentProps, Show } from 'solid-js'
import { createSignOut } from '#features/sign-out'
import { useI18n, usePalette } from '#shared/config'
import { useInSettings } from '../model/in-settings'
import { createMarkedPath } from '../model/marked-path'
import { createShell, ShellContext } from '../model/shell'
import { ShellPalette } from './shell-palette'
import { Sidebar } from './sidebar'
import { type Crumb, TopBar } from './top-bar'

/**
 * The frame the app screens share, drawn once and kept while the user moves between them (ADR 0037,
 * ADR 0039): the side menu (a drawer on phones), the sticky top bar with where you are, and the command
 * palette. Each screen is an `AppShell`, which tells the frame its title and its organization and draws its
 * own `main`. While no screen is on view (an entry screen of a first organization, a guard's "not found",
 * a first read), the frame stands aside and that page draws itself whole. The phone drawer closes when the screen changes, however it changed, except on the way
 * to the settings from its own account menu: the settings have a menu of their own, and the user is
 * likely to want another screen than the first.
 */
export function AppFrame(props: ParentProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const signOut = createSignOut(() => navigate('/login', { replace: true }))
  const palette = usePalette()
  const [drawerOpen, setDrawerOpen] = createSignal(false)
  const location = useLocation()
  let keepDrawer = false
  createEffect(
    on(
      () => location.pathname,
      () => {
        if (!keepDrawer) setDrawerOpen(false)
        keepDrawer = false
      },
      { defer: true }
    )
  )
  const inSettings = useInSettings()
  const marked = createMarkedPath()
  const shell = createShell(signOut.failure)
  const framed = () => shell.screen() !== undefined
  /** Where the screen sits, read from the route: a settings screen is under "Settings". */
  const parents = (): Crumb[] =>
    inSettings() ? [{ href: '/settings/profile', label: t('appShell.account.settings') }] : []

  const sidebar = (onNavigate?: () => void, onSettings?: () => void) => (
    <Sidebar path={marked} signOut={signOut.signOut} onNavigate={onNavigate} onSettings={onSettings} />
  )

  return (
    <ShellContext.Provider value={shell}>
      <div class={framed() ? 'md:grid md:grid-cols-[16rem_minmax(0,1fr)]' : undefined}>
        <Show when={framed()}>
          <aside class="sticky top-0 hidden h-screen border-r border-border-subtle md:block">{sidebar()}</aside>
          <Sheet
            open={drawerOpen()}
            onOpenChange={setDrawerOpen}
            title={t('appShell.menu')}
            closeLabel={t('appShell.closeMenu')}
          >
            {sidebar(
              () => setDrawerOpen(false),
              () => {
                keepDrawer = true
              }
            )}
          </Sheet>
          <ShellPalette signOut={signOut.signOut} />
        </Show>
        <div class={framed() ? 'min-w-0' : undefined}>
          <Show when={shell.screen()}>
            {(screen) => (
              <TopBar
                parents={parents()}
                title={screen().title()}
                onOpenMenu={() => setDrawerOpen(true)}
                onSearch={() => palette.setOpen(true)}
              />
            )}
          </Show>
          {props.children}
        </div>
      </div>
    </ShellContext.Provider>
  )
}
