import { A, useLocation } from '@solidjs/router'
import { For, type ParentProps } from 'solid-js'
import { ImpersonationBanner } from '#features/leave-impersonation'
import { useI18n } from '#shared/config'

const sections = [
  { href: '/admin/organizations', label: 'organizations' },
  { href: '/admin/users', label: 'users' }
] as const

const linkClass =
  'flex h-11 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:h-9'

/**
 * The back office's own frame (ADR 0077), apart from the app's: a top bar with its name, its two sections and
 * the way back to the app, and below it the banner of an operator's visit, the same one the app's frame draws.
 * It stays while the operator moves between its screens.
 */
export function BackOfficeFrame(props: ParentProps) {
  const { t } = useI18n()
  const location = useLocation()
  const current = (href: string) => location.pathname === href || location.pathname.startsWith(`${href}/`)

  return (
    <div class="min-h-screen bg-background">
      <ImpersonationBanner />
      <header class="border-b border-border-subtle bg-surface">
        <div class="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <span class="font-semibold tracking-tight">{t('backOffice.name')}</span>
          <nav aria-label={t('backOffice.nav.label')} class="flex-1">
            <ul class="m-0 flex list-none gap-1 p-0">
              <For each={sections}>
                {(section) => (
                  <li>
                    <A
                      href={section.href}
                      aria-current={current(section.href) ? 'page' : undefined}
                      class={linkClass}
                      activeClass=""
                      inactiveClass=""
                    >
                      {t(`backOffice.nav.${section.label}`)}
                    </A>
                  </li>
                )}
              </For>
            </ul>
          </nav>
          <A href="/" class={linkClass}>
            {t('backOffice.nav.app')}
          </A>
        </div>
      </header>
      {props.children}
    </div>
  )
}
