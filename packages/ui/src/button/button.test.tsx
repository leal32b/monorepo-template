import { render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { Button } from './button'

describe('Button', () => {
  it('does not submit a form unless told to', () => {
    render(() => (
      <>
        <Button>Cancel</Button>
        <Button type="submit">Save</Button>
      </>
    ))

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit')
  })

  it('calls onClick, but not while disabled', () => {
    const onClick = vi.fn()
    const [disabled, setDisabled] = createSignal(false)
    render(() => (
      <Button disabled={disabled()} onClick={onClick}>
        Save
      </Button>
    ))
    const button = screen.getByRole('button', { name: 'Save' })

    button.click()
    setDisabled(true)
    button.click()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
  })

  it('looks like its variant and size, and a passed class overrides its own', () => {
    render(() => (
      <Button variant="destructive" size="sm" class="px-6">
        Delete
      </Button>
    ))
    const button = screen.getByRole('button', { name: 'Delete' })

    expect(button).toHaveClass('bg-destructive', 'h-8', 'px-6')
    expect(button).not.toHaveClass('px-3')
  })
})
