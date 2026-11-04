import type { JSX } from 'solid-js'
import { cn } from '#libs'

export type CheckboxGroupProps = {
  /** What the checkboxes are about (a resource, such as "Members"). */
  label: string
  class?: string | undefined
  /** Its `Checkbox`es. */
  children: JSX.Element
}

/**
 * Checkboxes about one thing, framed together under their name: the permissions of one resource. The
 * name sits inside the frame, above the checkboxes, never on its line. Several sit side by side in a
 * grid from `sm` up.
 */
export function CheckboxGroup(props: CheckboxGroupProps) {
  return (
    <fieldset
      class={cn(
        'm-0 flex min-w-0 flex-col rounded-md border border-border-subtle bg-background px-3 py-2',
        props.class
      )}
    >
      {/* Floated, a legend leaves the border and sits inside the frame like any first line. */}
      <legend class="float-left mb-1 w-full p-0 text-sm font-medium">{props.label}</legend>
      <div class="clear-left flex flex-col">{props.children}</div>
    </fieldset>
  )
}
