import { Button, Icon } from '@repo/ui'
import { A } from '@solidjs/router'
import { For } from 'solid-js'
import { useI18n } from '#shared/config'

export type Crumb = { href: string; label: string }

export type TopBarProps = {
  /** The screens above this one, after the app: each a link. */
  parents: Crumb[]
  /** The screen's name: the last crumb. */
  title: string
  /** Opens the side menu; only phones show the button. */
  onOpenMenu: () => void
}

/**
 * Sticky, so where you are stays in view. From `md` up it holds the breadcrumb (the app, the screens
 * above, then this one); on phones the menu button and the app's name, since the title is the heading right below.
 */
export function TopBar(props: TopBarProps) {
  const { t } = useI18n()

  return (
    <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-subtle bg-background px-3 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        class="md:hidden"
        aria-label={t('appShell.openMenu')}
        onClick={props.onOpenMenu}
      >
        <Icon name="menu" />
      </Button>
      <span class="font-semibold tracking-tight md:hidden">{t('app.name')}</span>
      <nav aria-label={t('appShell.breadcrumb')} class="hidden min-w-0 md:block">
        <ol class="m-0 flex list-none items-center gap-2 p-0 text-sm text-muted-foreground">
          <li>
            <A href="/" class="rounded-sm underline-offset-4 hover:text-foreground hover:underline">
              {t('app.name')}
            </A>
          </li>
          <li aria-hidden="true" class="flex">
            <Icon name="next" />
          </li>
          <For each={props.parents}>
            {(parent) => (
              <>
                <li>
                  <A href={parent.href} class="rounded-sm underline-offset-4 hover:text-foreground hover:underline">
                    {parent.label}
                  </A>
                </li>
                <li aria-hidden="true" class="flex">
                  <Icon name="next" />
                </li>
              </>
            )}
          </For>
          <li aria-current="page" class="truncate font-medium text-foreground">
            {props.title}
          </li>
        </ol>
      </nav>
    </header>
  )
}
