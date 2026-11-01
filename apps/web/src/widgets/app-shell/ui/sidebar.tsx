import { cn, Icon, type IconName } from '@repo/ui'
import { A } from '@solidjs/router'
import { For } from 'solid-js'
import { useI18n } from '#shared/config'
import type { ServiceStatus } from '../model/service-status'
import { ServiceProblem, ServiceStatusButton } from './service-status'
import { UserMenu } from './user-menu'

export type SidebarProps = {
  status: ServiceStatus
  signOut: () => void
  /** Called after a link is followed, so the phone drawer can close. */
  onNavigate?: (() => void) | undefined
  class?: string | undefined
}

/** The product's own screens. Settings has its own menu, reached from the account. */
const items: { href: string; label: 'home'; icon: IconName }[] = [{ href: '/', label: 'home', icon: 'home' }]

/**
 * The side menu: the brand at the top, the product's screens, and at the foot the account with the
 * service status. A problem with the service is said in a line above the account; when all is well
 * only the icon stays.
 */
export function Sidebar(props: SidebarProps) {
  const { t } = useI18n()

  return (
    <div class={cn('flex h-full flex-col gap-4 bg-surface p-3', props.class)}>
      <A href="/" onClick={props.onNavigate} class="flex h-11 items-center px-2 font-semibold tracking-tight">
        {t('app.name')}
      </A>
      <nav aria-label={t('appShell.nav.main')} class="flex-1">
        <ul class="m-0 flex list-none flex-col gap-1 p-0">
          <For each={items}>
            {(item) => (
              <li>
                <A
                  href={item.href}
                  end
                  onClick={props.onNavigate}
                  class="flex h-11 items-center gap-2.5 rounded-md px-2 text-base text-muted-foreground transition-colors hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:h-9 sm:text-sm"
                >
                  <Icon name={item.icon} />
                  {t(`appShell.nav.${item.label}`)}
                </A>
              </li>
            )}
          </For>
        </ul>
      </nav>
      <div class="flex flex-col gap-2 border-t border-border-subtle pt-3">
        <ServiceProblem status={props.status} />
        <div class="flex items-center gap-1">
          <UserMenu signOut={props.signOut} class="flex-1" />
          <ServiceStatusButton status={props.status} />
        </div>
      </div>
    </div>
  )
}
