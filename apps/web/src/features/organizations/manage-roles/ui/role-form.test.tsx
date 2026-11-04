import { builtInRoles, type Permissions } from '@repo/contracts'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import type { Role } from '#entities/organizations'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RoleForm, type RoleFormProps } from './role-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const editor: Role = { name: 'editor', permissions: { invitation: ['create'], ac: ['read'] }, builtIn: false }
const roles: Role[] = [
  { name: 'owner', permissions: builtInRoles.owner, builtIn: true },
  { name: 'admin', permissions: builtInRoles.admin, builtIn: true },
  { name: 'member', permissions: builtInRoles.member, builtIn: true },
  editor,
  { name: 'billing', permissions: { member: ['update'] }, builtIn: false }
]
const refused = (code: string, status = 400) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch, props: Partial<RoleFormProps> = {}) {
  const handlers = { onSaved: vi.fn(), onGone: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <RoleForm
          organizationId="org-1"
          roles={roles}
          held={builtInRoles.admin as Permissions}
          {...handlers}
          {...props}
        />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>) =>
  JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
const nameField = () => screen.getByRole('textbox', { name: 'Role name' })
const box = (name: string) => screen.getByRole('checkbox', { name })
const group = (name: string) => within(screen.getByRole('group', { name }))
const create = () => fireEvent.click(screen.getByRole('button', { name: 'Create role' }))

describe('RoleForm', () => {
  describe('creating', () => {
    it('asks for a name and the permissions, in a group for each resource, none chosen', () => {
      renderForm(vi.fn<Fetch>())

      expect(nameField()).toHaveValue('')
      expect(screen.getAllByRole('checkbox').every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true)
      expect(
        group('Organization')
          .getAllByRole('checkbox')
          .map((checkbox) => checkbox.getAttribute('name'))
      ).toEqual(['organization:update'])
      expect(group('Members').getAllByRole('checkbox')).toHaveLength(3)
      expect(group('Invitations').getAllByRole('checkbox')).toHaveLength(2)
      expect(group('Roles').getAllByRole('checkbox')).toHaveLength(4)
    })

    it('leaves out the owner’s permission and says why', () => {
      renderForm(vi.fn<Fetch>())

      expect(screen.queryByRole('checkbox', { name: 'Delete the organization' })).not.toBeInTheDocument()
      expect(
        screen.getByText('Only the owner role can delete the organization, so no role of your own can.')
      ).toBeInTheDocument()
    })

    it('creates the role with the permissions chosen, the name cleaned', async () => {
      const fetch = vi.fn<Fetch>(async () => Response.json({ success: true }))
      const { onSaved } = renderForm(fetch)

      fireEvent.input(nameField(), { target: { value: '  Support ' } })
      fireEvent.click(box('Invite people'))
      fireEvent.click(box('See roles'))
      fireEvent.click(box('Invite people'))
      create()

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith({ name: 'support', permissions: { ac: ['read'] }, builtIn: false })
      )
      expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/create-role`)
      expect(sent(fetch)).toEqual({ organizationId: 'org-1', role: 'support', permission: { ac: ['read'] } })
    })

    it.each([
      ['empty', '', 'Enter a name for the role.'],
      ['built in', 'admin', 'Owner, admin and member are built in. Choose another name.'],
      ['repeated', 'Editor', 'This organization already has a role with this name. Choose another.'],
      ['malformed', 'big boss', 'Use lowercase letters, numbers and single hyphens, up to 32 characters.']
    ])('says so under the field when the name is %s, and sends nothing', (_case, value, message) => {
      const fetch = vi.fn<Fetch>()
      renderForm(fetch)

      fireEvent.input(nameField(), { target: { value } })
      fireEvent.click(box('See roles'))
      create()

      expect(nameField()).toHaveAccessibleDescription(message)
      expect(nameField()).toHaveFocus()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('asks for at least one permission', () => {
      const fetch = vi.fn<Fetch>()
      renderForm(fetch)

      fireEvent.input(nameField(), { target: { value: 'support' } })
      create()

      expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one permission.')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('marks a name the API says is taken, and refuses it again without asking', async () => {
      const fetch = vi.fn<Fetch>(async () => refused('ROLE_NAME_IS_ALREADY_TAKEN'))
      renderForm(fetch)
      fireEvent.input(nameField(), { target: { value: 'support' } })
      fireEvent.click(box('See roles'))

      create()

      await waitFor(() =>
        expect(nameField()).toHaveAccessibleDescription(
          'This organization already has a role with this name. Choose another.'
        )
      )
      create()
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('disables a permission the caller does not hold, and says so on it', () => {
      renderForm(vi.fn<Fetch>(), { held: { invitation: ['create'], ac: ['read'] } })

      expect(box('Invite people')).toBeEnabled()
      expect(box('Cancel invitations')).toBeDisabled()
      expect(box('Cancel invitations')).toHaveAccessibleDescription('You do not hold this permission.')
      expect(box('Invite people')).not.toHaveAccessibleDescription('You do not hold this permission.')
    })

    it('waits while the request is on its way', async () => {
      renderForm(() => new Promise(() => {}))
      fireEvent.input(nameField(), { target: { value: 'support' } })
      fireEvent.click(box('See roles'))

      create()

      await waitFor(() => expect(screen.getByRole('button', { name: 'Create role' })).toBeDisabled())
    })

    it('leaves through Cancel', () => {
      const { onCancel } = renderForm(vi.fn<Fetch>())

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['TOO_MANY_ROLES', 'This organization has as many roles as allowed. Delete one to create another.'],
      ['YOU_ARE_NOT_ALLOWED_TO_CREATE_A_ROLE', 'You cannot do this with this role. Your role may have changed.']
    ])('says what the API’s refusal %s means', async (code, text) => {
      renderForm(async () => refused(code, 403))
      fireEvent.input(nameField(), { target: { value: 'support' } })
      fireEvent.click(box('See roles'))

      create()

      expect(await screen.findByRole('alert')).toHaveTextContent(text)
    })

    it('says anything else in the usual words', async () => {
      renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))
      fireEvent.input(nameField(), { target: { value: 'support' } })
      fireEvent.click(box('See roles'))

      create()

      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    })
  })

  describe('editing', () => {
    it('starts with the name and the permissions of the role', () => {
      renderForm(vi.fn<Fetch>(), { role: editor })

      expect(nameField()).toHaveValue('editor')
      expect(box('Invite people')).toBeChecked()
      expect(box('See roles')).toBeChecked()
      expect(box('Add members')).not.toBeChecked()
    })

    it('saves the new permissions without renaming, when the name is the same', async () => {
      const fetch = vi.fn<Fetch>(async () => Response.json({ success: true }))
      const { onSaved } = renderForm(fetch, { role: editor })

      fireEvent.click(box('Add members'))
      fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
      expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/update-role`)
      expect(sent(fetch)).toEqual({
        organizationId: 'org-1',
        roleName: 'editor',
        data: { permission: { invitation: ['create'], ac: ['read'], member: ['create'] } }
      })
    })

    it('renames the role too when the name changed', async () => {
      const fetch = vi.fn<Fetch>(async () => Response.json({ success: true }))
      const { onSaved } = renderForm(fetch, { role: editor })

      fireEvent.input(nameField(), { target: { value: 'writer' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: 'writer' })))
      expect(sent(fetch)).toMatchObject({ roleName: 'editor', data: { roleName: 'writer' } })
    })

    it('locks the name of a role that is held, and says why, while its permissions stay editable', () => {
      renderForm(vi.fn<Fetch>(), { role: editor, nameLocked: true })

      expect(nameField()).toHaveAttribute('readonly')
      expect(
        screen.getByText('Members or invitations hold this role, so it cannot be renamed. Its permissions can change.')
      ).toBeInTheDocument()
      expect(box('Add members')).toBeEnabled()
    })

    it('does not count its own name as taken', async () => {
      const fetch = vi.fn<Fetch>(async () => Response.json({ success: true }))
      const { onSaved } = renderForm(fetch, { role: editor })

      fireEvent.click(box('Add members'))
      fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    })

    it('tells the screen when the role no longer exists', async () => {
      const { onGone } = renderForm(async () => refused('ROLE_NOT_FOUND'), { role: editor })

      fireEvent.click(box('Add members'))
      fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

      await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1))
    })

    it('says when members or invitations hold the role by the time of a rename', async () => {
      renderForm(async () => refused('ROLE_IN_USE'), { role: editor })

      fireEvent.input(nameField(), { target: { value: 'writer' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Members or invitations hold this role now. Give them another role first.'
      )
    })
  })
})
