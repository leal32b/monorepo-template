import { ListSkeleton } from '@repo/ui'
import { type JSX, onMount, type ParentProps, Suspense } from 'solid-js'
import { useI18n } from '#shared/config'
import { ReadFailure } from '#shared/ui'

export type BackOfficeScreenProps = ParentProps<{
  /** The screen's only heading. */
  title: string
  /** What could not be read, in the alert of `ReadFailure`. */
  unavailable: string
  /** A failure the screen says its own way, such as "not found"; `undefined` leaves it to the alert. */
  failure?: ((error: unknown) => JSX.Element | undefined) | undefined
}>

/**
 * One screen of the back office (ADR 0077): its heading, which takes focus as the screen opens, then its
 * content, which waits for its reads with the list's skeleton and says a read that failed in the one alert.
 */
export function BackOfficeScreen(props: BackOfficeScreenProps) {
  const { t } = useI18n()
  return (
    <main class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <h1
        ref={(heading) => onMount(() => heading.focus())}
        tabIndex={-1}
        class="text-2xl font-semibold tracking-tight outline-none"
      >
        {props.title}
      </h1>
      <ReadFailure message={props.unavailable} fallback={props.failure}>
        <Suspense fallback={<ListSkeleton label={t('appShell.loading')} />}>{props.children}</Suspense>
      </ReadFailure>
    </main>
  )
}
