import { type ComponentProps, Show, splitProps } from 'solid-js'
import { cn } from '#libs'
import { type BadgeVariantProps, badgeVariants } from './badge-variants'

export type BadgeProps = ComponentProps<'span'> &
  BadgeVariantProps & {
    /** Shows a dot before the text, in the badge's colour: for a state that can change, such as "On". */
    dot?: boolean | undefined
  }

/** Names a state in a word ("On", "Not set up"). The colour and the dot help; the text is what says it. */
export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'dot', 'children'])

  return (
    <span class={cn(badgeVariants({ variant: local.variant }), local.class)} {...rest}>
      <Show when={local.dot}>
        <span aria-hidden="true" class="size-2 rounded-full bg-current" />
      </Show>
      {local.children}
    </span>
  )
}
