import { Show } from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'

export type EmptyStateProps = {
  /** What the empty place is for, as a decorative icon. */
  icon: IconName
  /** What is missing, in a few words ("Nothing here yet"). */
  title: string
  /** What will fill it, or what to do: one line. */
  description?: string | undefined
  class?: string | undefined
}

/**
 * A place with nothing in it yet, said plainly instead of left blank: an icon, a short title and one
 * line, centred, as a short standalone message is. It sits in the frame with a subtle border, where the
 * content will be.
 */
export function EmptyState(props: EmptyStateProps) {
  return (
    <div
      class={cn(
        'flex flex-col items-center gap-2 rounded-md border border-border-subtle px-4 py-10 text-center',
        props.class
      )}
    >
      <span
        aria-hidden="true"
        class="flex size-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-muted-foreground"
      >
        <Icon name={props.icon} />
      </span>
      <p class="font-medium">{props.title}</p>
      <Show when={props.description}>
        <p class="max-w-sm text-sm text-muted-foreground">{props.description}</p>
      </Show>
    </div>
  )
}
