import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { createFormChecks } from './form-checks'

/** A form whose name must not be empty, checked the shared way; it reports what it would send. */
function renderForm() {
  const sent = vi.fn()
  render(() => {
    const [name, setName] = createSignal('')
    const checks = createFormChecks(() =>
      name() === '' ? { ok: false, problems: { name: 'required' } } : { ok: true, values: { name: name() } }
    )
    const submit = (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
      event.preventDefault()
      const values = checks.submit(event.currentTarget)
      if (values) sent(values)
    }
    return (
      <form noValidate onSubmit={submit} onFocusOut={checks.recheck}>
        <input
          aria-label="Name"
          aria-invalid={checks.problems().name ? 'true' : undefined}
          onInput={(event) => setName(event.currentTarget.value)}
        />
        <input aria-label="Notes" />
        <button type="submit">Send</button>
      </form>
    )
  })
  return sent
}

describe('createFormChecks', () => {
  it('checks on submit, focuses the first field with a problem, and gives the values only when all is well', () => {
    const sent = renderForm()
    const name = screen.getByRole('textbox', { name: 'Name' })

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(name).toBeInvalid()
    expect(name).toHaveFocus()
    expect(sent).not.toHaveBeenCalled()

    fireEvent.input(name, { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(sent).toHaveBeenCalledWith({ name: 'Ada' })
  })

  it('checks again when a field is left, only after the first submit and not on the way to a button', () => {
    renderForm()
    const name = screen.getByRole('textbox', { name: 'Name' })
    const notes = screen.getByRole('textbox', { name: 'Notes' })
    const button = screen.getByRole('button', { name: 'Send' })

    fireEvent.focusOut(name, { relatedTarget: notes })
    expect(name).not.toBeInvalid()

    fireEvent.click(button)
    fireEvent.input(name, { target: { value: 'Ada' } })
    fireEvent.focusOut(name, { relatedTarget: button })
    expect(name).toBeInvalid()

    fireEvent.focusOut(name, { relatedTarget: notes })
    expect(name).not.toBeInvalid()
  })
})
