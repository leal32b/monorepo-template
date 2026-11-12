import { A } from '@solidjs/router'
import { type JSX, onMount, type ParentProps, Show } from 'solid-js'
import { useI18n } from '#shared/config'
import { LanguagePicker } from './language-picker'

export type EntryLayoutProps = ParentProps<{
  /**
   * Whose page this is, when it is not the app's: a tenant's public page names its organization here
   * (ADR 0060), as plain text, since a visitor has nothing to go to at the app's start. Without it, the
   * app's name links to the start.
   */
  brand?: string | undefined
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
 * the language can be changed in the footer. A tenant's public page is drawn in the same frame, with the
 * organization's name in the brand's place (ADR 0060). Focus moves to the title when the screen opens, as a
 * route change.
 */
export function EntryLayout(props: EntryLayoutProps) {
  const { t } = useI18n()

  return (
    <>
      <main class="mx-auto flex w-full max-w-sm flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <Show
          when={props.brand}
          fallback={
            <A href="/" class="self-start text-sm font-semibold tracking-tight">
              {t('app.name')}
            </A>
          }
        >
          {(brand) => <span class="self-start text-sm font-semibold tracking-tight break-words">{brand()}</span>}
        </Show>
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
      <footer class="mx-auto w-full max-w-sm px-4 pb-8 sm:px-6 sm:pb-12">
        <LanguagePicker />
      </footer>
    </>
  )
}
