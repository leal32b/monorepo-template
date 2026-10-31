import { type ComponentProps, splitProps } from 'solid-js'
import { cn } from '#libs'
import { linkClass } from './link-class'

export type LinkProps = ComponentProps<'a'>

/**
 * A text link. A native `<a>`, so the app's router handles a click on it like any other link; a
 * passed `class` overrides its own, and other attributes reach the anchor.
 */
export function Link(props: LinkProps) {
  const [local, rest] = splitProps(props, ['class'])

  return <a class={cn(linkClass, local.class)} {...rest} />
}
