import { builtInRoles } from '@repo/contracts'
import { fireEvent, render, screen, within } from '@solidjs/testing-library'
import type { Role } from '#entities/organizations'
import { I18nProvider } from '#shared/config'
import { RoleView } from './role-view'

const admin: Role = { name: 'admin', permissions: builtInRoles.admin, builtIn: true }

function renderView(role: Role) {
  const onClose = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <RoleView role={role} onClose={onClose} />
    </I18nProvider>
  ))
  return { onClose }
}

describe('RoleView', () => {
  it('shows every permission in the role form’s grid, what the role grants checked, nothing to change', () => {
    renderView(admin)
    const members = screen.getByRole('group', { name: 'Members' })

    expect(within(members).getByRole('checkbox', { name: 'Add members' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Delete the organization' })).not.toBeChecked()
    fireEvent.click(screen.getByText('Add members'))
    expect(within(members).getByRole('checkbox', { name: 'Add members' })).toBeChecked()
  })

  it('shows a role that grants nothing with nothing checked', () => {
    renderView({ name: 'empty', permissions: {}, builtIn: false })

    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked()
  })

  it('closes from its button', () => {
    const { onClose } = renderView(admin)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })
})
