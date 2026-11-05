import { SettingsSkeleton } from '@repo/ui'
import { createMemo, onCleanup, onMount, type ParentProps, Show, Suspense } from 'solid-js'
import { useCurrentOrganization } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { useShell } from '../model/shell'
import { AppFrame } from './app-frame'
import { screenClass } from './screen-class'

/**
 * An app screen: its title and content in one column, mobile first, inside the frame the screens share
 * (`AppFrame`, ADR 0037), which it tells its title and organization while it is on view. Focus moves to
 * the title when the screen opens; a failed sign-out shows below it. A screen with no frame around it,
 * such as one drawn on its own in a test, draws one.
 *
 * What the screen reads waits under a boundary of its own (ADR 0038): moving to a screen never waits on its
 * data, so its title is drawn at once and its skeleton holds the content's place until the data is in.
 */
export function AppShell(props: ParentProps<{ title: string }>) {
  const shell = useShell()
  if (shell === undefined) {
    return (
      <AppFrame>
        <AppShell title={props.title}>{props.children}</AppShell>
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
      <h1
        ref={(heading) => onMount(() => heading.focus())}
        tabIndex={-1}
        class="text-2xl font-semibold tracking-tight outline-none"
      >
        {props.title}
      </h1>
      <Show when={shell.signOutFailure()}>{(failure) => <AuthFailureAlert failure={failure()} />}</Show>
      <Suspense fallback={<SettingsSkeleton label={t('appShell.loading')} />}>{props.children}</Suspense>
    </main>
  )
}
