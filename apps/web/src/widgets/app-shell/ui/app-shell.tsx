import { createMemo, onCleanup, onMount, type ParentProps, Show } from 'solid-js'
import { useCurrentOrganization } from '#entities/organizations'
import { AuthFailureAlert } from '#shared/ui'
import { useShell } from '../model/shell'
import { AppFrame } from './app-frame'

/**
 * An app screen: its title and content in one column, mobile first, inside the frame the screens share
 * (`AppFrame`, ADR 0037), which it tells its title and organization while it is on view. Focus moves to
 * the title when the screen opens; a failed sign-out shows below it. A screen with no frame around it,
 * such as one drawn on its own in a test, draws one.
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

  const current = useCurrentOrganization()
  // A memo keeps its last value once its screen has left, when the guard's context no longer can.
  const organization = createMemo(() => current?.organization)
  onCleanup(shell.enter({ title: () => props.title, organization }))

  return (
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-8 sm:px-6 md:pt-8 md:pb-12">
      <h1
        ref={(heading) => onMount(() => heading.focus())}
        tabIndex={-1}
        class="text-2xl font-semibold tracking-tight outline-none"
      >
        {props.title}
      </h1>
      <Show when={shell.signOutFailure()}>{(failure) => <AuthFailureAlert failure={failure()} />}</Show>
      {props.children}
    </main>
  )
}
