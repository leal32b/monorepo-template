import { render, screen } from '@solidjs/testing-library'
import { Button } from '#button'
import { Alert } from './alert'

describe('Alert', () => {
  it('announces an error at once, as an alert, with its title and message', () => {
    render(() => (
      <Alert variant="error" title="Sign-in failed">
        The email or the password is wrong.
      </Alert>
    ))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Sign-in failed')
    expect(alert).toHaveTextContent('The email or the password is wrong.')
  })

  it('announces anything else politely, as a status', () => {
    render(() => <Alert>We sent you a link.</Alert>)

    expect(screen.getByRole('status')).toHaveTextContent('We sent you a link.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a reference to quote to support, and the next action', () => {
    render(() => (
      <Alert variant="error" reference="Code: internal_error · 6f1c2a" action={<Button>Try again</Button>}>
        Something went wrong.
      </Alert>
    ))

    expect(screen.getByRole('alert')).toHaveTextContent('Code: internal_error · 6f1c2a')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it.each([
    ['info', 'bg-primary', 'text-primary'],
    ['error', 'bg-destructive', 'text-destructive'],
    ['success', 'bg-success', 'text-success'],
    ['warning', 'bg-warning', 'text-warning']
  ] as const)('looks like its kind, %s: a bar and an icon of its colour on a raised box', (variant, bar, icon) => {
    const { container } = render(() => <Alert variant={variant}>Something happened.</Alert>)
    const alert = screen.getByRole(variant === 'error' ? 'alert' : 'status')

    expect(alert).toHaveClass('bg-surface', 'border-border-subtle')
    expect(container.querySelector('span[aria-hidden="true"]')).toHaveClass(bar, 'w-1')
    expect(container.querySelector('svg')).toHaveClass(icon)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('has an icon of its own for each kind, so it is not told by colour alone', () => {
    const drawn = (variant: 'info' | 'error' | 'success' | 'warning') => {
      const { container, unmount } = render(() => <Alert variant={variant}>Message.</Alert>)
      const path = container.querySelector('svg')?.innerHTML
      unmount()
      return path
    }

    const all = [drawn('info'), drawn('error'), drawn('success'), drawn('warning')]

    expect(new Set(all).size).toBe(4)
  })

  it('is info by default, and a passed class is added to its own', () => {
    render(() => <Alert class="mt-4">Something happened.</Alert>)

    expect(screen.getByRole('status')).toHaveClass('mt-4', 'py-4')
  })

  it('passes other attributes to its root, so the app can move focus to it', () => {
    render(() => (
      <Alert variant="error" id="form-error" tabIndex={-1}>
        Something went wrong.
      </Alert>
    ))
    const alert = screen.getByRole('alert')

    alert.focus()

    expect(alert).toHaveAttribute('id', 'form-error')
    expect(alert).toHaveFocus()
  })
})
