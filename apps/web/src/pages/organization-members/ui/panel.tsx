import { onMount, type ParentProps } from 'solid-js'

/** Which kind of form is open on a member's row. One at a time, so what the user is doing is always the one thing open. */
export type PanelName = 'role' | 'remove' | 'leave'

/**
 * The form a row opens below itself, named for screen readers and given focus when it opens, so the
 * keyboard starts where the form does.
 */
export function Panel(props: ParentProps<{ label: string }>) {
  return (
    <fieldset
      tabIndex={-1}
      ref={(panel) => onMount(() => panel.focus())}
      class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 outline-none"
    >
      <legend class="sr-only">{props.label}</legend>
      {props.children}
    </fieldset>
  )
}
