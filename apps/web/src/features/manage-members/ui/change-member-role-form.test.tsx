import { builtInRoles } from '@repo/contracts'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import type { Member, Role } from '#entities/organizations'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ChangeMemberRoleForm } from './change-member-role-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const roles: Role[] = [
  { name: 'owner', permissions: builtInRoles.owner, builtIn: true },
  { name: 'admin', permissions: builtInRoles.admin, builtIn: true },
  { name: 'member', permissions: builtInRoles.member, builtIn: true },
  { name: 'editor', permissions: { invitation: ['create'] }, builtIn: false }
]
const grace: Member = {
  id: 'm2',
  userId: 'u2',
  name: 'Grace',
  email: 'grace@example.com',
  roles: ['member'],
  createdAt: new Date('2026-11-04T12:00:00.000Z')
}
const refused = (code: string, status = 403) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch, held = builtInRoles.admin as never) {
  const handlers = { onChanged: vi.fn(), onGone: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <ChangeMemberRoleForm organizationId="org-1" member={grace} roles={roles} held={held} {...handlers} />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const select = () => screen.getByRole('combobox', { name: 'Role' })
const choose = (value: string) => fireEvent.change(select(), { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

describe('ChangeMemberRoleForm', () => {
  it('lists every role of the organization, the current one chosen, and names them in the user’s language', () => {
    renderForm(vi.fn<Fetch>())

    expect(select()).toHaveValue('member')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Owner (you cannot give this role)',
      'Admin',
      'Member',
      'editor'
    ])
  })

  it('disables a role that grants more than the caller holds, and says why', () => {
    renderForm(vi.fn<Fetch>())

    expect(screen.getByRole('option', { name: 'Owner (you cannot give this role)' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Admin' })).toBeEnabled()
    expect(
      screen.getByText('A role marked here holds a permission you do not, so you cannot give it.')
    ).toBeInTheDocument()
  })

  it('has no such note when every role can be given', () => {
    renderForm(vi.fn<Fetch>(), builtInRoles.owner as never)

    expect(screen.queryByText(/so you cannot give it/)).not.toBeInTheDocument()
  })

  it('gives the member the role chosen', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ id: 'm2', role: 'admin' }))
    const { onChanged } = renderForm(fetch)

    choose('admin')
    save()

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('admin'))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/update-member-role`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      organizationId: 'org-1',
      memberId: 'm2',
      role: 'admin'
    })
  })

  it('closes without a request when the role is the one they already have', () => {
    const fetch = vi.fn<Fetch>()
    const { onCancel } = renderForm(fetch)

    save()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits while the request is on its way', async () => {
    renderForm(() => new Promise(() => {}))

    choose('admin')
    save()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save role' })).toBeDisabled())
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['MEMBER_OUTRANKS_YOU', 'You cannot do this with this person. Your role may have changed.'],
    ['ROLE_EXCEEDS_YOUR_PERMISSIONS', 'You cannot do this with this person. Your role may have changed.'],
    [
      'YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER',
      'The organization needs an owner. Make someone else an owner first.'
    ]
  ])('says what the API’s refusal %s means', async (code, text) => {
    const { onChanged } = renderForm(async () => refused(code))

    choose('admin')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('tells the screen when the person is no longer a member', async () => {
    const { onGone } = renderForm(async () => refused('MEMBER_NOT_FOUND', 400))

    choose('admin')
    save()

    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1))
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    choose('admin')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
