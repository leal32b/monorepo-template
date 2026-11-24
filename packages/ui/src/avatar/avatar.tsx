import { createSignal, Show } from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'

export type AvatarProps = {
  /** Whose it is: its first letter is drawn. */
  name?: string | undefined
  /** An icon in the letter's place, for someone with no name yet (an invited address: `mail`). */
  icon?: IconName | undefined
  /** `circle` for a person, `square` for an organization. */
  shape?: 'circle' | 'square' | undefined
  /**
   * An image in the letter's place, such as an organization's logo: fitted whole inside the mark, never
   * cropped. Until it loads, and if it cannot be loaded (an address that expired), the letter shows.
   */
  src?: string | undefined
  /** `xs` in a tab, `sm` in a menu's trigger, `md` beside a row's title. */
  size?: 'xs' | 'sm' | 'md' | undefined
  class?: string | undefined
}

/**
 * Who or what a row or a menu is about, as one mark everywhere: a person is a circle, an organization
 * a square, each with its first letter, or its image when it has one. It is decorative: the name beside
 * it says the same. The image takes the mark's size, so loading it moves nothing.
 */
export function Avatar(props: AvatarProps) {
  const [loaded, setLoaded] = createSignal<string>()
  const [failed, setFailed] = createSignal<string>()
  const image = () => (props.src !== undefined && failed() !== props.src ? props.src : undefined)
  const letter = () => props.name?.trim().slice(0, 1).toUpperCase()

  return (
    <span
      aria-hidden="true"
      class={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden border border-border-subtle bg-background font-semibold text-foreground',
        props.shape === 'square' ? 'rounded-md' : 'rounded-full',
        { xs: 'size-6 text-xs', sm: 'size-8 text-sm', md: 'size-9 text-sm' }[props.size ?? 'md'],
        props.class
      )}
    >
      <Show when={props.icon} fallback={loaded() === image() && image() !== undefined ? undefined : letter()}>
        {(name) => <Icon name={name()} class="text-muted-foreground" />}
      </Show>
      <Show when={image()} keyed>
        {(src) => (
          <img
            src={src}
            alt=""
            class={cn('absolute inset-0 size-full object-contain', loaded() === src ? 'opacity-100' : 'opacity-0')}
            onLoad={() => setLoaded(src)}
            onError={() => setFailed(src)}
          />
        )}
      </Show>
    </span>
  )
}
