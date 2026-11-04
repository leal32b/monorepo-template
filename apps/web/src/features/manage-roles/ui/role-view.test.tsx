import { builtInRoles } from '@repo/contracts'
import { fireEvent, render, screen, within } from '@solidjs/testing-library'
import type { Role } from '#entities/organizations'
import { I18nProvider } from '#shared/config'
import { RoleView } from './role-view'

const admin: Role = { name: 'admin', permissions: builtInRoles.admin, builtIn: true }
const owner: Role = { name: 'owner', permissions: builtInRoles.owner, builtIn: true }

function renderView(role: Role, reason?: string) {
  const onClose = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <RoleView role={role} reason={reason} onClose={onClose} />
    </I18nProvider>
  ))
  return { onClose }
}

describe('RoleView', () => {
  it('lists what the role grants, a group per resource, and nothing it does not', () => {
    renderView(admin)

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Organization' })).getAllByRole('listitem')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Members' })).getAllByRole('listitem')).toHaveLength(3)
    expect(within(screen.getByRole('region', { name: 'Roles' })).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByText('Delete the organization')).not.toBeInTheDocument()
  })

  it('includes what only the owner has', () => {
    renderView(owner)

    expect(screen.getByText('Delete the organization')).toBeInTheDocument()
  })

  it('leaves out a resource the role grants nothing on', () => {
    renderView({ name: 'editor', permissions: { invitation: ['create'] }, builtIn: false })

    expect(screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual(['Invitations'])
    expect(screen.getByText('Invite people')).toBeInTheDocument()
    expect(screen.queryByText('This role grants no permission.')).not.toBeInTheDocument()
  })

  it('says so when the role grants nothing', () => {
    renderView({ name: 'empty', permissions: {}, builtIn: false })

    expect(screen.getByText('This role grants no permission.')).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('says first why it cannot be changed, when it has a reason', () => {
    renderView(admin, 'Built-in roles cannot be changed.')

    expect(screen.getByText('Built-in roles cannot be changed.')).toBeInTheDocument()
  })

  it('has no reason line without one', () => {
    renderView(admin)

    expect(screen.queryByText('Built-in roles cannot be changed.')).not.toBeInTheDocument()
  })

  it('closes', () => {
    const { onClose } = renderView(admin)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
