import { Show } from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'

export type AvatarProps = {
  /** Whose it is: its first letter is drawn. */
  name?: string | undefined
  /** An icon in the letter's place, for someone with no name yet (an invited address: `mail`). */
  icon?: IconName | undefined
  /** `circle` for a person, `square` for an organization. */
  shape?: 'circle' | 'square' | undefined
  /** `sm` in a menu's trigger, `md` beside a row's title. */
  size?: 'sm' | 'md' | undefined
  class?: string | undefined
}

/**
 * Who or what a row or a menu is about, as one mark everywhere: a person is a circle, an organization
 * a square, each with its first letter. It is decorative: the name beside it says the same.
 */
export function Avatar(props: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      class={cn(
        'flex shrink-0 items-center justify-center border border-border-subtle bg-background text-sm font-semibold text-foreground',
        props.shape === 'square' ? 'rounded-md' : 'rounded-full',
        props.size === 'sm' ? 'size-8' : 'size-9',
        props.class
      )}
    >
      <Show when={props.icon} fallback={props.name?.trim().slice(0, 1).toUpperCase()}>
        {(name) => <Icon name={name()} class="text-muted-foreground" />}
      </Show>
    </span>
  )
}
