import type { JSX } from 'solid-js'
import { Button } from '#button'
import { FormActions } from '#form-actions'

export type ConfirmFormProps = {
  /** What will happen, said before the button: who or what, and what it costs. */
  message: string
  /** The button that does it, named for the outcome ("Remove member"). */
  confirmLabel: string
  cancelLabel: string
  /** While the request is on its way: the button waits, so a second press sends nothing. */
  pending: boolean
  onConfirm: (event: SubmitEvent & { currentTarget: HTMLFormElement }) => void
  onCancel: () => void
  /** For the field in `children`: checked again when it is left, as in any form (`createFormChecks`). */
  onFocusOut?: ((event: FocusEvent) => void) | undefined
  /** A field the user fills to confirm, such as the name typed to delete an organization. */
  children?: JSX.Element
  /** What went wrong, below the buttons, where nothing above moves. */
  failure?: JSX.Element
}

/**
 * Asks once, inline, before something that removes: what will happen, then the destructive button and
 * Cancel. It is the same for every such action (remove, leave, delete), and lives in a row's panel
 * rather than a dialog. `children` adds a field to fill first, for what cannot be undone.
 */
export function ConfirmForm(props: ConfirmFormProps) {
  return (
    <form
      noValidate
      class="flex flex-col gap-4"
      onFocusOut={(event) => props.onFocusOut?.(event)}
      onSubmit={(event) => {
        event.preventDefault()
        props.onConfirm(event)
      }}
    >
      <p class="text-muted-foreground">{props.message}</p>
      {props.children}
      <FormActions>
        <Button type="submit" variant="destructive" disabled={props.pending}>
          {props.confirmLabel}
        </Button>
        <Button variant="ghost" onClick={() => props.onCancel()}>
          {props.cancelLabel}
        </Button>
      </FormActions>
      {props.failure}
    </form>
  )
}
