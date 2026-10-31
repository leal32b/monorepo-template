import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import type { AuthFailure } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ConfirmPasswordForm } from './confirm-password-form'

type Confirm = (password: string) => Promise<AuthFailure | undefined>

function renderForm(confirm = vi.fn<Confirm>(async () => undefined), variant?: 'primary' | 'destructive') {
  render(() => (
    <I18nProvider locale="en">
      <ConfirmPasswordForm submit="Set up" confirm={confirm} variant={variant} />
    </I18nProvider>
  ))
  return {
    confirm,
    field: screen.getByLabelText('Your password'),
    button: screen.getByRole('button', { name: 'Set up' })
  }
}

/** A failure of the call the password confirms. */
const failure = (code: string | undefined, status = 400): AuthFailure => ({ status, code, requestId: undefined })

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

describe('ConfirmPasswordForm', () => {
  it('asks for the password, saying why, the way password managers expect', () => {
    const { field } = renderForm()

    expect(field).toHaveAttribute('autocomplete', 'current-password')
    expect(field).toHaveAccessibleDescription('To confirm it is you.')
  })

  it("is the view's main action, or marks one that weakens the account", () => {
    expect(renderForm().button).toHaveClass('bg-primary')
    document.body.replaceChildren()

    expect(renderForm(undefined, 'destructive').button).toHaveClass('bg-destructive')
  })

  it('asks for the password before confirming anything', () => {
    const { confirm, field, button } = renderForm()

    fireEvent.click(button)

    expect(field).toHaveAccessibleDescription(/Enter your password\./)
    expect(field).toHaveFocus()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('confirms with the password as typed, and holds the button while it waits', async () => {
    let answer: (failure: AuthFailure | undefined) => void = () => {}
    const pending = vi.fn<Confirm>(
      () =>
        new Promise((resolve) => {
          answer = resolve
        })
    )
    const { confirm, field, button } = renderForm(pending)

    type(field, ' my password ')
    fireEvent.click(button)

    expect(confirm).toHaveBeenCalledWith(' my password ')
    expect(button).toBeDisabled()
    answer(undefined)
    await waitFor(() => expect(button).toBeEnabled())
  })

  it('says on the field when the password is wrong, and does not send it again', async () => {
    const { confirm, field, button } = renderForm(vi.fn<Confirm>(async () => failure('INVALID_PASSWORD')))

    type(field, 'a wrong password')
    fireEvent.click(button)

    await waitFor(() => expect(field).toHaveAccessibleDescription(/This is not your current password\./))
    expect(field).toHaveFocus()
    fireEvent.click(button)
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('says what else went wrong below the button', async () => {
    const { field, button } = renderForm(vi.fn<Confirm>(async () => failure(undefined, 429)))

    type(field, 'my password')
    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })
})
