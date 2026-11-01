import { A } from '@solidjs/router'
import { type JSX, onMount, type ParentProps, Show } from 'solid-js'
import { useI18n } from '#shared/config'
import { LanguagePicker } from './language-picker'
import { ServiceNotice } from './service-notice'

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
 * where it was. A problem with the service is said below the content, before the user tries, and
 * the language can be changed in the footer. Focus moves to the title when the screen opens, as a
 * route change.
 */
export function EntryLayout(props: EntryLayoutProps) {
  const { t } = useI18n()

  return (
    <>
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
        <ServiceNotice />
        <Show when={props.footer}>
          <div class="text-sm text-muted-foreground">{props.footer}</div>
        </Show>
      </main>
      <footer class="mx-auto w-full max-w-sm px-4 pb-8 sm:px-6 sm:pb-12">
        <LanguagePicker />
      </footer>
    </>
  )
}
