import { Show } from 'solid-js'
import { cn } from '#libs'
import { GoogleMark } from './brand-icons'
import { type DuotoneName, type IconName, type IconWeight, markupOf } from './icons'

/** How the icons are drawn when a screen does not say. */
const defaultWeight: IconWeight = 'regular'

/** How an icon is drawn: always `regular`, and `duotone` only for the icons that come in it (the type says which). */
type Drawn = { name: IconName; weight?: 'regular' | undefined } | { name: DuotoneName; weight?: IconWeight | undefined }

export type IconProps = Drawn & {
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
  const classes = () => cn('size-[1.25em] shrink-0', props.class)
  const hidden = () => (props.label ? undefined : 'true')
  const role = () => (props.label ? 'img' : undefined)

  return (
    <Show
      when={markupOf(props.name, props.weight ?? defaultWeight)}
      fallback={<GoogleMark class={classes()} aria-hidden={hidden()} role={role()} aria-label={props.label} />}
    >
      {(markup) => (
        <svg
          viewBox="0 0 256 256"
          fill="currentColor"
          class={classes()}
          aria-hidden={hidden()}
          role={role()}
          aria-label={props.label}
          innerHTML={markup()}
        />
      )}
    </Show>
  )
}
