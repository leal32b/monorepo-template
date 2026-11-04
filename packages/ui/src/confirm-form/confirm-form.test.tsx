import { fireEvent, render, screen } from '@solidjs/testing-library'
import { ConfirmForm } from './confirm-form'

function renderForm(pending = false) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(() => (
    <ConfirmForm
      message="Remove Grace from Acme? She loses access at once."
      confirmLabel="Remove member"
      cancelLabel="Cancel"
      pending={pending}
      onConfirm={onConfirm}
      onCancel={onCancel}
      failure={<p role="alert">It failed.</p>}
    >
      <input aria-label="Type the name" />
    </ConfirmForm>
  ))
  return { onConfirm, onCancel }
}

describe('ConfirmForm', () => {
  it('says what will happen, then the field, the destructive button and Cancel, then what went wrong', () => {
    renderForm()
    const message = screen.getByText(/Remove Grace from Acme/)
    const field = screen.getByRole('textbox', { name: 'Type the name' })
    const confirm = screen.getByRole('button', { name: 'Remove member' })
    const alert = screen.getByRole('alert')

    expect(message.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(field.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(confirm.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(confirm).toHaveClass('bg-destructive')
  })

  it('confirms on submit and cancels on Cancel', () => {
    const { onConfirm, onCancel } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Remove member' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps the button waiting while the request is on its way', () => {
    renderForm(true)

    expect(screen.getByRole('button', { name: 'Remove member' })).toBeDisabled()
  })
})
