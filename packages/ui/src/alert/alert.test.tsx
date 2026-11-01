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

  it('looks like its variant, and a passed class is added to its own', () => {
    render(() => (
      <Alert variant="error" class="mt-4">
        Something went wrong.
      </Alert>
    ))
    const alert = screen.getByRole('alert')

    expect(alert).toHaveClass('border-destructive', 'p-4', 'mt-4')
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
