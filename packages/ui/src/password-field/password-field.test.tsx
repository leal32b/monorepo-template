import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { PasswordField } from './password-field'

describe('PasswordField', () => {
  it('is a labelled password input, hidden by default, with a 44px toggle on phones', () => {
    render(() => <PasswordField label="Password" toggleLabel="Show password" />)
    const toggle = screen.getByRole('button', { name: 'Show password' })

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Password')).toHaveClass('pl-3', 'pr-11', 'sm:pr-9')
    expect(screen.getByLabelText('Password')).not.toHaveClass('px-3')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveClass('h-11', 'w-11', 'sm:h-9', 'sm:w-9')
  })

  it("keeps the toggle's hover inside the input's border: the whole button is pressed, a smaller chip lights up", () => {
    render(() => <PasswordField label="Password" toggleLabel="Show password" />)
    const toggle = screen.getByRole('button', { name: 'Show password' })

    expect(toggle.className).not.toMatch(/(^| )hover:bg-/)
    expect(toggle.firstElementChild).toHaveClass('size-8', 'group-hover:bg-secondary')
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

  it("reads its hint with the input, its error in the hint's place, and passes other attributes to it", () => {
    const [error, setError] = createSignal<string | undefined>('Use at least 15 characters.')
    render(() => (
      <PasswordField
        label="New password"
        toggleLabel="Show password"
        description="At least 15 characters."
        error={error()}
        autocomplete="new-password"
      />
    ))
    const input = screen.getByLabelText('New password')

    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Use at least 15 characters.')
    expect(screen.queryByText('At least 15 characters.')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('autocomplete', 'new-password')

    setError(undefined)

    expect(input).toHaveAccessibleDescription('At least 15 characters.')
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
