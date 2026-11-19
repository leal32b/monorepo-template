import { EmptyState, type IconName } from '@repo/ui'
import { type JSX, type ParentProps, Show } from 'solid-js'
import { ReadFailure } from '#shared/ui'
import { AppShell } from './app-shell'

export type GuardedScreenProps = ParentProps<{
  /** The screen's only heading, as `AppShell` takes it. */
  title: string
  /** Whether the caller's role holds the screen's read permission: `current.can('customer', 'read')`. */
  allowed: boolean
  /** The icon of the empty places the guard draws. */
  icon: IconName
  /** What a role without the read permission is told, naming the organization and who to ask. */
  noAccess: { title: string; description: string }
  /** What could not be read, in the alert of `ReadFailure`. */
  unavailable: string
  /** A refusal of the screen's own, such as a plan without its capability (ADR 0063): drawn in place of the content. */
  refusal?: (() => JSX.Element | undefined) | undefined
}>

/**
 * The guard every organization screen with a permission starts from: the app shell with the title, then
 * what the caller may see. A role without the read permission is told so and nothing of the content is
 * drawn, so no read starts; a refusal of the screen's own (the plan lacks its capability) replaces the
 * content the same way; otherwise the content draws under `ReadFailure`, which says a read that failed in
 * the one alert with a way to try again (ADR 0038).
 */
export function GuardedScreen(props: GuardedScreenProps) {
  return (
    <AppShell title={props.title}>
      <Show
        when={props.allowed}
        fallback={
          <EmptyState icon={props.icon} title={props.noAccess.title} description={props.noAccess.description} />
        }
      >
        <Show
          when={props.refusal?.()}
          fallback={<ReadFailure message={props.unavailable}>{props.children}</ReadFailure>}
        >
          {(refusal) => refusal()}
        </Show>
      </Show>
    </AppShell>
  )
}
