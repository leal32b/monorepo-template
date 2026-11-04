import type { ParentProps } from 'solid-js'
import { cn } from '#libs'

export type FormActionsProps = ParentProps<{ class?: string | undefined }>

/**
 * The buttons that end a form, the one that sends it first and Cancel after it. Where the form is
 * narrow (a phone, a narrow column) they stack and take the full width; where it is wide they sit side
 * by side at their own width. It follows the form's width, not the screen's.
 */
export function FormActions(props: FormActionsProps) {
  return (
    <div class={cn('@container mt-2', props.class)}>
      <div class="flex flex-col gap-2 *:w-full @md:flex-row @md:*:w-auto">{props.children}</div>
    </div>
  )
}
