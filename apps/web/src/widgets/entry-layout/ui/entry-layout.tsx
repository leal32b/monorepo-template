import { A } from '@solidjs/router'
import { type JSX, onMount, type ParentProps, Show } from 'solid-js'
import { useI18n } from '#shared/config'

export type EntryLayoutProps = ParentProps<{
  /** The screen's only heading. */
  title: string
  /**
   * What the screen is for, in one short line: when it fits one line on a phone, the form starts
   * at the same height on every entry screen.
   */
  description?: string | undefined
  /** Links to the other entry screens, always below the form. */
  footer?: JSX.Element
}>

/**
 * The frame every entry screen shares (sign-up, sign-in, MFA, password): brand, title, description,
 * content and footer, top-aligned in one narrow column, so moving between them keeps each element
 * where it was. Focus moves to the title when the screen opens, as a route change.
 */
export function EntryLayout(props: EntryLayoutProps) {
  const { t } = useI18n()

  return (
    <main class="mx-auto flex w-full max-w-sm flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <A href="/" class="self-start text-sm font-semibold tracking-tight">
        {t('app.name')}
      </A>
      <div class="flex flex-col gap-2">
        <h1
          ref={(heading) => onMount(() => heading.focus())}
          tabIndex={-1}
          class="text-2xl font-semibold tracking-tight outline-none"
        >
          {props.title}
        </h1>
        <Show when={props.description}>
          <p class="text-muted-foreground">{props.description}</p>
        </Show>
      </div>
      {props.children}
      <Show when={props.footer}>
        <div class="text-sm text-muted-foreground">{props.footer}</div>
      </Show>
    </main>
  )
}
