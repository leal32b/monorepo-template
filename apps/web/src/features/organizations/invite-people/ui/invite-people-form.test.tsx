import { builtInRoles, type Permissions } from '@repo/contracts'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import type { Role } from '#entities/organizations'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { InvitePeopleForm } from './invite-people-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const roles: Role[] = [
  { name: 'owner', permissions: builtInRoles.owner, builtIn: true },
  { name: 'admin', permissions: builtInRoles.admin, builtIn: true },
  { name: 'member', permissions: builtInRoles.member, builtIn: true },
  { name: 'editor', permissions: { invitation: ['create'], ac: ['read'] }, builtIn: false }
]
const refused = (code: string, status = 400) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch, held: Permissions = builtInRoles.admin, rolesList: Role[] = roles) {
  const handlers = { onInvited: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <InvitePeopleForm
          organizationId="org-1"
          roles={rolesList}
          held={held}
          memberEmails={new Set(['ada@example.com'])}
          {...handlers}
        />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>) =>
  JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
const emailField = () => screen.getByRole('textbox', { name: 'Email' })
const roleSelect = () => screen.getByRole('combobox', { name: 'Role' })
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
const invite = (email: string) => {
  fireEvent.input(emailField(), { target: { value: email } })
  send()
}

describe('InvitePeopleForm', () => {
  it('asks for an email and a role, the plain member chosen to start with, and offers no suggestions', () => {
    renderForm(vi.fn<Fetch>())

    expect(emailField()).toHaveAttribute('type', 'email')
    expect(emailField()).toHaveAttribute('autocomplete', 'off')
    expect(roleSelect()).toHaveValue('member')
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
    renderForm(vi.fn<Fetch>(), builtInRoles.owner)

    expect(screen.queryByText(/so you cannot give it/)).not.toBeInTheDocument()
  })

  it('starts on the first role that can be given when the plain member cannot', () => {
    renderForm(vi.fn<Fetch>(), { invitation: ['create'] }, [
      { name: 'member', permissions: builtInRoles.member, builtIn: true },
      { name: 'editor', permissions: { invitation: ['create'] }, builtIn: false }
    ])

    expect(roleSelect()).toHaveValue('editor')
  })

  it('leaves every role disabled, none chosen for the caller, when none can be given', () => {
    renderForm(vi.fn<Fetch>(), { invitation: ['create'] }, roles.slice(0, 3))

    expect(screen.getAllByRole('option').every((option) => (option as HTMLOptionElement).disabled)).toBe(true)
  })

  it('sends the invitation with the address cleaned and the role chosen', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ id: 'inv-1' }))
    const { onInvited } = renderForm(fetch)

    fireEvent.change(roleSelect(), { target: { value: 'editor' } })
    invite('  Grace@Example.COM ')

    await waitFor(() => expect(onInvited).toHaveBeenCalledWith('grace@example.com'))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/invite-member`)
    expect(sent(fetch)).toEqual({ organizationId: 'org-1', email: 'grace@example.com', role: 'editor' })
  })

  it('says so under the field for an address that is not one, focuses it and sends nothing', () => {
    const fetch = vi.fn<Fetch>()
    renderForm(fetch)

    invite('grace@')

    expect(emailField()).toHaveAccessibleDescription('Enter an email address, like ada@example.com.')
    expect(emailField()).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses someone already in the organization without asking, however the address is typed', () => {
    const fetch = vi.fn<Fetch>()
    renderForm(fetch)

    invite(' ADA@example.com ')

    expect(emailField()).toHaveAccessibleDescription('This person is already a member.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('marks a member the list did not know of when the API says so, and refuses them again without asking', async () => {
    const fetch = vi.fn<Fetch>(async () => refused('USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION'))
    const { onInvited } = renderForm(fetch)

    invite('linus@example.com')

    await waitFor(() => expect(emailField()).toHaveAccessibleDescription('This person is already a member.'))
    expect(onInvited).not.toHaveBeenCalled()
    send()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('waits while the request is on its way', async () => {
    renderForm(() => new Promise(() => {}))

    invite('grace@example.com')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Send invitation' })).toBeDisabled())
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['ROLE_EXCEEDS_YOUR_PERMISSIONS', 403, 'You cannot invite with this role. Your role may have changed.'],
    [
      'INVITATION_LIMIT_REACHED',
      403,
      'This organization has as many pending invitations as allowed. Revoke one to send another.'
    ],
    ['TOO_MANY_INVITATIONS', 429, 'You sent many invitations in a short time. Wait a minute, then try again.']
  ])('says what the API’s refusal %s means', async (code, status, text) => {
    renderForm(async () => refused(code, status))

    invite('grace@example.com')

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
  })

  it('says anything else in the usual words, keeping what was typed', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    invite('grace@example.com')

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    expect(emailField()).toHaveValue('grace@example.com')
  })
})
