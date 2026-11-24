import { useLocation, useNavigate } from '@solidjs/router'
import { createEffect, lazy, type ParentProps, Show } from 'solid-js'
import { useImpersonation } from '#entities/impersonations'
import { createSignOut } from '#features/sign-out'
import { loadGroups, useI18n, usePalette } from '#shared/config'
import { createLastScreens } from '../model/last-screen'
import { createMarkedPath } from '../model/marked-path'
import { screensOf } from '../model/product-screens'
import { createShell, type Shell, ShellContext, useFrameOrganization, useShellOrganization } from '../model/shell'
import { OrganizationMenu } from './organization-menu'
import { tabBarRoom } from './screen-class'
import { ShellPalette } from './shell-palette'
import { Sidebar } from './sidebar'
import { TabBar } from './tab-bar'

/** The banner of an operator's visit (ADR 0077), with its words, downloaded only by a device where one is on. */
const ImpersonationBanner = lazy(() =>
  Promise.all([import('#features/leave-impersonation'), loadGroups(['backOffice'])]).then(([m]) => ({
    default: m.ImpersonationBanner
  }))
)

/**
 * The frame the app screens share, drawn once and kept while the user moves between them (ADR 0037,
 * ADR 0039), split by owner (ADR 0080): from `md` the side menu, the organization's menu at its top and the
 * person's at its foot; below it a top row with the organization's menu and a tab bar at the bottom; and the
 * command palette. Each screen is an `AppShell`, which tells the frame its organization and
 * draws its own `main`. While no screen is on view (an entry screen of a first organization, a guard's "not
 * found", a first read), the frame stands aside and that page draws itself whole. The frame remembers the
 * last product screen of each organization, which the settings go back to.
 */
export function AppFrame(props: ParentProps) {
  const navigate = useNavigate()
  const signOut = createSignOut(() => navigate('/login', { replace: true }))
  const shell = createShell(signOut)

  return (
    <ShellContext.Provider value={shell}>
      <Frame shell={shell}>{props.children}</Frame>
    </ShellContext.Provider>
  )
}

/** The frame's parts, inside the shell's context, from which they read the organization they draw. */
function Frame(props: ParentProps<{ shell: Shell }>) {
  const { t } = useI18n()
  const impersonation = useImpersonation()
  const palette = usePalette()
  const location = useLocation()
  const marked = createMarkedPath()
  const current = useShellOrganization()
  const organization = useFrameOrganization()
  const last = createLastScreens()
  createEffect(() => last.see(location.pathname, current()))
  const framed = () => props.shell.screen() !== undefined
  const search = () => palette.setOpen(true)

  return (
    <>
      <Show when={impersonation.current()}>
        <ImpersonationBanner />
      </Show>
      <div class={framed() ? `md:grid md:grid-cols-[16rem_minmax(0,1fr)] ${tabBarRoom}` : undefined}>
        <Show when={framed()}>
          <aside class="sticky top-0 hidden h-screen border-r border-border-subtle md:block">
            <Sidebar
              organization={organization()}
              path={marked}
              back={last.of(organization())}
              onSearch={search}
              signOut={props.shell.signOut}
            />
          </aside>
          <header class="sticky top-0 z-30 flex h-14 items-center border-b border-border-subtle bg-background px-3 md:hidden">
            <OrganizationMenu organization={organization()} />
          </header>
          <TabBar
            screens={screensOf(organization()).map((screen) => ({
              ...screen,
              label: t(`appShell.nav.${screen.label}`)
            }))}
            path={marked}
            onSearch={search}
          />
          <ShellPalette signOut={props.shell.signOut} />
        </Show>
        <div class={framed() ? 'min-w-0' : undefined}>{props.children}</div>
      </div>
    </>
  )
}
