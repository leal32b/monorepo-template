import { Button, Icon } from '@repo/ui'
import { A } from '@solidjs/router'
import { For } from 'solid-js'
import { paletteShortcut, useI18n } from '#shared/config'

export type Crumb = { href: string; label: string }

export type TopBarProps = {
  /** The screens above this one, after the app: each a link. */
  parents: Crumb[]
  /** The screen's name: the last crumb. */
  title: string
  /** Opens the side menu; only phones show the button. */
  onOpenMenu: () => void
  /** Opens the command palette, which ⌘K opens too. */
  onSearch: () => void
}

/**
 * Sticky, so where you are stays in view, in the same column as the screen below it. From `md` up it holds the breadcrumb (the screens
 * above, then this one); on phones the menu button and the app's name, since the title is the heading right below.
 */
export function TopBar(props: TopBarProps) {
  const { t } = useI18n()

  return (
    <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-subtle bg-background">
      <div class="mx-auto flex h-full w-full max-w-3xl items-center gap-2 px-3 md:px-6">
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
        <Button
          variant="outline"
          size="icon"
          class="ml-auto md:hidden"
          aria-label={t('appShell.search')}
          aria-keyshortcuts="Control+K Meta+K"
          onClick={props.onSearch}
        >
          <Icon name="search" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="ml-auto hidden gap-2 text-muted-foreground md:inline-flex"
          aria-keyshortcuts="Control+K Meta+K"
          onClick={props.onSearch}
        >
          <Icon name="search" />
          {t('appShell.search')}
          <kbd class="font-sans text-xs">{paletteShortcut(navigator.platform)}</kbd>
        </Button>
      </div>
    </header>
  )
}
