import { fireEvent, render, screen } from '@solidjs/testing-library'
import { PasswordField } from './password-field'

describe('PasswordField', () => {
  it('is a labelled password input, hidden by default, with a 44px toggle on phones', () => {
    render(() => <PasswordField label="Password" toggleLabel="Show password" />)
    const toggle = screen.getByRole('button', { name: 'Show password' })

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveClass('h-11', 'w-11', 'sm:h-9', 'sm:w-9')
  })

  it('shows what was typed and hides it again, keeping the value', () => {
    render(() => <PasswordField label="Password" toggleLabel="Show password" value="correct horse" />)
    const input = screen.getByLabelText('Password')
    const toggle = screen.getByRole('button', { name: 'Show password' })

    toggle.click()

    expect(input).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(input).toHaveValue('correct horse')

    toggle.click()

    expect(input).toHaveAttribute('type', 'password')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('reads its hint and its error with the input, and passes other attributes to it', () => {
    render(() => (
      <PasswordField
        label="New password"
        toggleLabel="Show password"
        description="At least 15 characters."
        error="This password appeared in a data breach."
        autocomplete="new-password"
      />
    ))
    const input = screen.getByLabelText('New password')

    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription(/At least 15 characters\./)
    expect(input).toHaveAccessibleDescription(/This password appeared in a data breach\./)
    expect(input).toHaveAttribute('autocomplete', 'new-password')
  })

  it('reports what is typed', () => {
    const onChange = vi.fn()
    render(() => <PasswordField label="Password" toggleLabel="Show password" onChange={onChange} />)

    fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'correct horse' } })

    expect(onChange).toHaveBeenCalledWith('correct horse')
  })

  it('turns the toggle off with the field', () => {
    render(() => <PasswordField label="Password" toggleLabel="Show password" disabled />)

    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
  })
})
