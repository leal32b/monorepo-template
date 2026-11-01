import { type ComponentProps, type JSX, Show, splitProps } from 'solid-js'
import { Icon, type IconName } from '#icon'

export type SettingsRowProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** A decorative icon before the title. */
  icon?: IconName | undefined
  /** A decorative letter in the icon's place, for a mark the icon set lacks, such as "G" for Google. */
  letter?: string | undefined
  /** What the row is about. */
  title: string
  /** The row's state, such as a `Badge`, beside the title. */
  badge?: JSX.Element
  /** What the row does or what it is now, in one line. */
  description?: string | undefined
  /**
   * What just happened, such as "Your password was changed": announced politely, in the row where the
   * user acted. The area is always there, so a change to it is read out.
   */
  status?: string | undefined
  /** The row's action, such as a `Button`: on the right, and full width on phones. */
  action?: JSX.Element
  /** The form the action opens, inline below the row. One panel at a time is the screen's job. */
  panel?: JSX.Element
}

/**
 * One setting: icon, title with its state, a line of description, and the action on the right. On
 * phones the action drops below and takes the full width. What the action opens appears under the
 * row in the `panel`, never on another page. Put it inside a `SettingsSection`.
 */
export function SettingsRow(props: SettingsRowProps) {
  const [local, rest] = splitProps(props, [
    'class',
    'icon',
    'letter',
    'title',
    'badge',
    'description',
    'status',
    'action',
    'panel'
  ])

  return (
    <div class={local.class} {...rest}>
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <div class="flex min-w-0 flex-1 items-start gap-3">
          <Show when={local.icon || local.letter}>
            <span
              aria-hidden="true"
              class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface text-muted-foreground"
            >
              <Show when={local.icon} fallback={<span class="font-bold text-foreground">{local.letter}</span>}>
                {(name) => <Icon name={name()} />}
              </Show>
            </span>
          </Show>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 font-medium">
              {local.title}
              {local.badge}
            </div>
            <Show when={local.description}>
              <p class="mt-0.5 text-sm text-muted-foreground">{local.description}</p>
            </Show>
            <p role="status" class="flex items-start gap-1.5 text-sm text-success not-empty:mt-1.5">
              <Show when={local.status}>
                <Icon name="success" class="mt-0.5 size-4" />
                {local.status}
              </Show>
            </p>
          </div>
        </div>
        <Show when={local.action}>
          {(action) => <div class="flex shrink-0 gap-2 *:flex-1 sm:*:flex-none">{action()}</div>}
        </Show>
      </div>
      <Show when={local.panel}>
        {(panel) => (
          <div class="ds-reveal flex flex-col gap-4 border-t border-border-subtle bg-surface p-4 sm:p-5">{panel()}</div>
        )}
      </Show>
    </div>
  )
}
