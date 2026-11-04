import { builtInRoles, type OrganizationMembership, type Permissions } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import type { ParentProps } from 'solid-js'
import { CurrentOrganizationProvider, OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { OrganizationMembersPage } from './organization-members-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }

const row = (id: string, name: string, role: string) => ({
  id,
  organizationId: 'org-1',
  userId: `u-${id}`,
  role,
  createdAt: '2026-11-04T12:00:00.000Z',
  user: { id: `u-${id}`, name, email: `${name.toLowerCase()}@example.com`, image: null }
})

/** Ada (the caller, id u1), Grace the admin, Linus a plain member, Ken with a role of the organization's own. */
const everyone = [
  row('m1', 'Ada', 'owner'),
  row('m2', 'Grace', 'admin'),
  row('m3', 'Linus', 'member'),
  row('m4', 'Ken', 'editor')
]
const editor = { id: 'r1', organizationId: 'org-1', role: 'editor', permission: { invitation: ['create'] } }

type Options = {
  /** Which member the caller is. */
  as?: string
  roles?: string[]
  members?: ReturnType<typeof row>[]
  auth?: Fetch
  locale?: Locale
}

function renderPage({ as = 'm1', roles = ['owner'], members = everyone, auth, locale = 'en' }: Options = {}) {
  const permissions: Permissions = roles.includes('owner')
    ? builtInRoles.owner
    : roles.includes('admin')
      ? builtInRoles.admin
      : builtInRoles.member
  const authFetch: Fetch =
    auth ??
    (async (input) => {
      const url = String(input)
      if (url.includes('/organization/list-members')) return Response.json({ members, total: members.length })
      if (url.includes('/organization/list-roles')) return Response.json([editor])
      if (url.includes('/organization/list')) return Response.json([acme])
      return Response.json({ status: true })
    })
  const history = createMemoryHistory()
  history.set({ value: '/acme/settings/members' })
  render(() => (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
            <AuthProvider client={createAuthClient({ fetch: authFetch })}>
              <SessionProvider user={{ id: `u-${as}`, email: 'ada@example.com', name: 'Ada' }}>
                <MemoryRouter history={history}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route
                      path="/:orgSlug"
                      component={(props: ParentProps) => (
                        <CurrentOrganizationProvider
                          organization={acme}
                          membership={{ roles, permissions: permissions as OrganizationMembership['permissions'] }}
                        >
                          {props.children}
                        </CurrentOrganizationProvider>
                      )}
                    >
                      <Route path="/settings/members" component={OrganizationMembersPage} />
                    </Route>
                    <Route path="/" component={() => <p>The root</p>} />
                  </Route>
                </MemoryRouter>
              </SessionProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
  return history
}

/** The row of a person: the box around their name, with its buttons and notes. */
const rowOf = async (name: string) =>
  within((await screen.findByText(name, { selector: 'div' })).closest('div.flex-col') as HTMLElement)
const buttonsOf = async (name: string) =>
  (await rowOf(name)).queryAllByRole('button').map((button) => button.textContent)

describe('OrganizationMembersPage', () => {
  it('lists everyone with their email and roles, naming the built-in ones in the user’s language and the caller', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
    const people = within(await screen.findByRole('region', { name: 'People' }))
    expect(people.getByText('grace@example.com')).toBeInTheDocument()
    expect((await rowOf('Ada')).getByText('You')).toBeInTheDocument()
    expect((await rowOf('Ada')).getByText('Owner')).toBeInTheDocument()
    expect((await rowOf('Grace')).getByText('Admin')).toBeInTheDocument()
    expect((await rowOf('Linus')).getByText('Member')).toBeInTheDocument()
    expect((await rowOf('Ken')).getByText('editor')).toBeInTheDocument()
  })

  it('lets the owner change and remove everyone else, and not leave while the only owner, saying why', async () => {
    renderPage()

    expect(await buttonsOf('Grace')).toEqual(['Change role', 'Remove'])
    expect(await buttonsOf('Ken')).toEqual(['Change role', 'Remove'])
    expect(await buttonsOf('Ada')).toEqual([])
    expect(
      (await rowOf('Ada')).getByText('The only owner. Make someone else an owner before changing this role or leaving.')
    ).toBeInTheDocument()
  })

  it('lets an owner leave when another owner remains', async () => {
    renderPage({ members: [row('m1', 'Ada', 'owner'), row('m2', 'Grace', 'owner')] })

    expect(await buttonsOf('Ada')).toEqual(['Leave'])
  })

  it('lets an admin manage the people below, and says it cannot touch the owner', async () => {
    renderPage({ as: 'm2', roles: ['admin'] })

    expect(await buttonsOf('Linus')).toEqual(['Change role', 'Remove'])
    expect(await buttonsOf('Ada')).toEqual([])
    expect(
      (await rowOf('Ada')).getByText('This person holds permissions you do not, so you cannot change or remove them.')
    ).toBeInTheDocument()
    expect(await buttonsOf('Grace')).toEqual(['Leave'])
  })

  it('shows a plain member the list, who manages it, and only the way to leave', async () => {
    renderPage({ as: 'm3', roles: ['member'] })

    expect(
      await screen.findByText('Everyone who can open Acme. Owners and admins manage who is here.')
    ).toBeInTheDocument()
    expect(await buttonsOf('Grace')).toEqual([])
    expect(await buttonsOf('Linus')).toEqual(['Leave'])
    expect(screen.queryByText(/so you cannot change or remove them/)).not.toBeInTheDocument()
  })

  it('changes a role: says so in the row, with the new role shown', async () => {
    renderPage()
    fireEvent.click((await rowOf('Linus')).getByRole('button', { name: 'Change role' }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Role' }), { target: { value: 'admin' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

    expect(await screen.findByText('Role changed to Admin')).toBeInTheDocument()
    expect((await rowOf('Linus')).getByText('Admin')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('opens one form at a time, below its row', async () => {
    renderPage()

    fireEvent.click((await rowOf('Linus')).getByRole('button', { name: 'Change role' }))

    expect(await screen.findByRole('group', { name: 'Change role' })).toHaveFocus()
    expect(screen.getAllByRole('button', { name: 'Remove' }).every((button) => button.hasAttribute('disabled'))).toBe(
      true
    )
  })

  it('closes a form from Cancel', async () => {
    renderPage()
    fireEvent.click((await rowOf('Linus')).getByRole('button', { name: 'Remove' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('group')).not.toBeInTheDocument())
  })

  it('removes a member after asking, drops the row and says who was removed', async () => {
    renderPage()
    fireEvent.click((await rowOf('Linus')).getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText('Remove Linus from Acme? They lose access right away.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove member' }))

    expect(await screen.findByText('Linus was removed')).toBeInTheDocument()
    expect(screen.queryByText('linus@example.com')).not.toBeInTheDocument()
    expect(screen.getByText('Linus was removed')).toHaveFocus()
  })

  it('leaves the organization, and goes to the root', async () => {
    const history = renderPage({ members: [row('m1', 'Ada', 'owner'), row('m2', 'Grace', 'owner')] })
    fireEvent.click((await rowOf('Ada')).getByRole('button', { name: 'Leave' }))
    expect(
      await screen.findByText('Leave Acme? You lose access right away, and need a new invitation to come back.')
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Leave organization' }))

    expect(await screen.findByText('The root')).toBeInTheDocument()
    expect(history.get()).toBe('/')
  })

  it('reads the list again and says so when the person was already gone', async () => {
    let removed = false
    renderPage({
      auth: async (input) => {
        const url = String(input)
        if (url.includes('/organization/list-members')) {
          const members = removed ? everyone.filter((member) => member.id !== 'm3') : everyone
          return Response.json({ members, total: members.length })
        }
        if (url.includes('/organization/list-roles')) return Response.json([editor])
        if (url.includes('/organization/remove-member')) {
          removed = true
          return Response.json({ code: 'MEMBER_NOT_FOUND' }, { status: 400 })
        }
        return Response.json([acme])
      }
    })
    fireEvent.click((await rowOf('Linus')).getByRole('button', { name: 'Remove' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Remove member' }))

    expect(await screen.findByText('This person is no longer a member. The list has been updated.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('linus@example.com')).not.toBeInTheDocument())
  })

  it('reads the list again and says so when the person was already gone while changing a role', async () => {
    let changed = false
    renderPage({
      auth: async (input) => {
        const url = String(input)
        if (url.includes('/organization/list-members')) {
          const members = changed ? everyone.filter((member) => member.id !== 'm3') : everyone
          return Response.json({ members, total: members.length })
        }
        if (url.includes('/organization/list-roles')) return Response.json([editor])
        if (url.includes('/organization/update-member-role')) {
          changed = true
          return Response.json({ code: 'MEMBER_NOT_FOUND' }, { status: 400 })
        }
        return Response.json([acme])
      }
    })
    fireEvent.click((await rowOf('Linus')).getByRole('button', { name: 'Change role' }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Role' }), { target: { value: 'admin' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

    expect(await screen.findByText('This person is no longer a member. The list has been updated.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('linus@example.com')).not.toBeInTheDocument())
  })

  it('says when the members could not be read, and tries again when asked', async () => {
    let attempts = 0
    renderPage({
      auth: async (input) => {
        const url = String(input)
        if (url.includes('/organization/list-members')) {
          attempts += 1
          return attempts === 1
            ? Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
            : Response.json({ members: everyone, total: 4 })
        }
        if (url.includes('/organization/list-roles')) return Response.json([editor])
        return Response.json([acme])
      }
    })

    expect(
      await screen.findByText('We could not load the members. Check your connection, then try again.')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument()
  })

  it('speaks the language of the provider', async () => {
    renderPage({ locale: 'pt-BR' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Membros' })).toBeInTheDocument()
    expect((await rowOf('Grace')).getByText('Administrador')).toBeInTheDocument()
  })
})
