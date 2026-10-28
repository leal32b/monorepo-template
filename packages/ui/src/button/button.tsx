import { Button as KobalteButton } from '@kobalte/core/button'
import { type ComponentProps, splitProps } from 'solid-js'
import { cn } from '#libs'
import { type ButtonVariantProps, buttonVariants } from './button-variants'

export type ButtonProps = ComponentProps<'button'> & ButtonVariantProps

/** Triggers an action. A native `<button>` with `type="button"` unless told otherwise (Kobalte's default). */
export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'size'])
  const classes = () => cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)

  return <KobalteButton class={classes()} {...rest} />
}
