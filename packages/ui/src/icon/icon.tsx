import { Dynamic } from 'solid-js/web'
import { cn } from '#libs'
import { type IconName, icons } from './icons'

export type IconProps = {
  /** Which icon, by what it means. */
  name: IconName
  /** Names the icon for screen readers. Leave it out when text beside it already says the same. */
  label?: string | undefined
  class?: string | undefined
}

/**
 * An icon from the template's set (ADR 0027), so an app never imports the set itself. Decorative
 * unless given a `label`: hidden from screen readers, because the text beside it says what it
 * means. An icon that stands alone, such as the one on an icon-only button, takes a label. It is
 * sized in `em`, so it follows the text around it; a passed `class` places it (ADR 0025), it does
 * not resize it.
 */
export function Icon(props: IconProps) {
  return (
    <Dynamic
      component={icons[props.name]}
      class={cn('size-[1.25em] shrink-0', props.class)}
      aria-hidden={props.label ? undefined : 'true'}
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
    />
  )
}
