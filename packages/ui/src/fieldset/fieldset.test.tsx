import { render, screen } from '@solidjs/testing-library'
import { Fieldset } from './fieldset'

describe('Fieldset', () => {
  it('is a group named by its label, described by its hint', () => {
    render(() => (
      <Fieldset label="Permissions" description="Pick what the role may do." class="mt-2">
        <input type="checkbox" aria-label="Invite" />
      </Fieldset>
    ))
    const group = screen.getByRole('group', { name: 'Permissions' })

    expect(group).toHaveAccessibleDescription('Pick what the role may do.')
    expect(group).toHaveClass('mt-2')
    expect(group).not.toHaveAttribute('aria-invalid')
  })

  it('shows its error in the hint’s place, announced, and marks the group invalid', () => {
    render(() => (
      <Fieldset label="Permissions" description="Pick what the role may do." error="Choose at least one.">
        <input type="checkbox" aria-label="Invite" />
      </Fieldset>
    ))

    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one.')
    expect(screen.queryByText('Pick what the role may do.')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Permissions' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('needs no hint', () => {
    const { container } = render(() => (
      <Fieldset label="Permissions">
        <span />
      </Fieldset>
    ))

    expect(container.querySelector('p')).toBeNull()
  })
})
