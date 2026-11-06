import { SettingsSkeleton } from '@repo/ui'
import { createMemo, onCleanup, onMount, type ParentProps, Show, Suspense } from 'solid-js'
import { useCurrentOrganization } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { useShell } from '../model/shell'
import { AppFrame } from './app-frame'
import { screenClass } from './screen-class'

export type AppShellProps = ParentProps<{
  /** The screen's only heading, also the last step of the top bar's trail. */
  title: string
  /** What the screen is for, in one line under the title, for a screen that is one message and its actions. */
  description?: string | undefined
}>

/**
 * An app screen: its title and content in one column, mobile first, inside the frame the screens share
 * (`AppFrame`, ADR 0037), which it tells its title and organization while it is on view. Focus moves to
 * the title when the screen opens; a failed sign-out shows below it. A screen with no frame around it,
 * such as one drawn on its own in a test, draws one.
 *
 * What the screen reads waits under a boundary of its own (ADR 0038): moving to a screen never waits on its
 * data, so its title is drawn at once and its skeleton holds the content's place until the data is in.
 */
export function AppShell(props: AppShellProps) {
  const shell = useShell()
  if (shell === undefined) {
    return (
      <AppFrame>
        <AppShell title={props.title} description={props.description}>
          {props.children}
        </AppShell>
      </AppFrame>
    )
  }

  const { t } = useI18n()
  const current = useCurrentOrganization()
  // A memo keeps its last value once its screen has left, when the guard's context no longer can.
  const organization = createMemo(() => current?.organization)
  onCleanup(shell.enter({ title: () => props.title, organization }))

  return (
    <main class={screenClass}>
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
      <Show when={shell.signOutFailure()}>{(failure) => <AuthFailureAlert failure={failure()} />}</Show>
      <Suspense fallback={<SettingsSkeleton label={t('appShell.loading')} />}>{props.children}</Suspense>
    </main>
  )
}
