import { builtInRoles, type OrganizationMembership, type Permissions } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import type { ParentProps } from 'solid-js'
import { CurrentOrganizationProvider, OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { OrganizationRolesPage } from './organization-roles-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }

const member = (id: string, name: string, role: string) => ({
  id,
  organizationId: 'org-1',
  userId: `u-${id}`,
  role,
  createdAt: '2026-11-04T12:00:00.000Z',
  user: { id: `u-${id}`, name, email: `${name.toLowerCase()}@example.com`, image: null }
})
const invitation = (id: string, role: string) => ({
  id,
  organizationId: 'org-1',
  email: `${id}@example.com`,
  role,
  status: 'pending',
  expiresAt: '2999-01-01T00:00:00.000Z'
})
const customRole = (id: string, role: string, permission: Record<string, string[]>) => ({
  id,
  organizationId: 'org-1',
  role,
  permission
})

/** Ada, who owns Acme; Ken holds "editor"; "billing" and "support" are held by nobody. */
const defaults = {
  members: [member('m1', 'Ada', 'owner'), member('m2', 'Ken', 'editor')],
  roles: [
    customRole('r1', 'editor', { invitation: ['create'], ac: ['read'] }),
    customRole('r2', 'billing', { member: ['update'] })
  ],
  invitations: [invitation('new', 'editor')]
}

type Options = {
  held?: Permissions
  members?: ReturnType<typeof member>[]
  roles?: ReturnType<typeof customRole>[]
  invitations?: ReturnType<typeof invitation>[]
  auth?: Fetch
  locale?: Locale
}

function renderPage({ held = builtInRoles.owner as Permissions, locale = 'en', auth, ...data }: Options = {}) {
  const { members, roles, invitations } = { ...defaults, ...data }
  const authFetch: Fetch =
    auth ??
    (async (input) => {
      const url = String(input)
      if (url.includes('/organization/list-members')) return Response.json({ members, total: members.length })
      if (url.includes('/organization/list-roles')) return Response.json(roles)
      if (url.includes('/organization/list-invitations')) return Response.json(invitations)
      if (url.includes('/organization/list')) return Response.json([acme])
      return Response.json({ success: true })
    })
  const history = createMemoryHistory()
  history.set({ value: '/acme/settings/roles' })
  render(() => (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
            <AuthProvider client={createAuthClient({ fetch: authFetch })}>
              <SessionProvider user={{ id: 'u-m1', email: 'ada@example.com', name: 'Ada' }}>
                <MemoryRouter history={history}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route
                      path="/:orgSlug"
                      component={(props: ParentProps) => (
                        <CurrentOrganizationProvider
                          organization={acme}
                          membership={{ roles: ['owner'], permissions: held as OrganizationMembership['permissions'] }}
                        >
                          {props.children}
                        </CurrentOrganizationProvider>
                      )}
                    >
                      <Route path="/settings/roles" component={OrganizationRolesPage} />
                    </Route>
                  </Route>
                </MemoryRouter>
              </SessionProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
}

/** The row of a role: the box around its title, with its buttons and notes. */
const rowOf = async (title: string) =>
  within((await screen.findByText(title, { selector: 'div' })).closest('div.flex-col') as HTMLElement)
const buttonsOf = async (title: string) =>
  (await rowOf(title)).queryAllByRole('button').map((button) => button.textContent)

describe('OrganizationRolesPage', () => {
  it('holds the place of the list while a slow answer comes, so nothing jumps when it does', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderPage({ auth: () => new Promise<Response>(() => {}) })

    vi.advanceTimersByTime(300)

    expect(screen.getAllByRole('status').some((line) => line.textContent === 'Loading…')).toBe(true)
    vi.useRealTimers()
  })

  it('shows the three built-in roles, marked so, with how much each can do and a way to view it', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Roles' })).toBeInTheDocument()
    const builtIn = within(await screen.findByRole('region', { name: 'Built-in roles' }))
    expect(builtIn.getAllByText('Built in')).toHaveLength(3)
    expect((await rowOf('Owner')).getByText('11 of 11 permissions')).toBeInTheDocument()
    expect((await rowOf('Admin')).getByText('10 of 11 permissions')).toBeInTheDocument()
    expect((await rowOf('Member')).getByText('1 of 11 permissions')).toBeInTheDocument()
    expect(await buttonsOf('Owner')).toEqual(['View permissions'])
  })

  it('shows a built-in role in the grid the form uses, read only, with what it grants checked', async () => {
    renderPage()
    fireEvent.click((await rowOf('Admin')).getByRole('button', { name: 'View permissions' }))

    const roles = await screen.findByRole('group', { name: 'Roles' })
    expect(within(roles).getByRole('checkbox', { name: 'Create roles' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Delete the organization' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Create roles' })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument())
  })

  it('names who holds a role, members and invitations, and so blocks deleting and renaming it', async () => {
    renderPage()

    const editor = await rowOf('Editor')
    expect(
      editor.getByText(
        'Held by Ken and new@example.com (invited). Give them another role before renaming or deleting this role.'
      )
    ).toBeInTheDocument()
    expect(editor.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(editor.getByRole('button', { name: 'Edit' })).toBeEnabled()

    fireEvent.click(editor.getByRole('button', { name: 'Edit' }))
    expect(await screen.findByRole('textbox', { name: 'Role name' })).toHaveAttribute('readonly')
  })

  it('says how many more hold the role when the list is long', async () => {
    const holders = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name, index) => member(`h${index}`, name, 'editor'))
    renderPage({ members: holders, invitations: [] })

    expect(
      (await rowOf('Editor')).getByText(
        'Held by A, B, C, D, and E +2 more. Give them another role before renaming or deleting this role.'
      )
    ).toBeInTheDocument()
  })

  it('lets the owner edit and delete a role nobody holds', async () => {
    renderPage()

    const billing = await rowOf('Billing')
    expect(billing.queryByText(/Held by/)).not.toBeInTheDocument()
    expect(await buttonsOf('Billing')).toEqual(['Edit', 'Delete'])
    expect(billing.getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it('deletes a role nobody holds after asking, drops the row and says which was deleted', async () => {
    renderPage()
    fireEvent.click((await rowOf('Billing')).getByRole('button', { name: 'Delete' }))
    expect(
      await screen.findByText('Delete the role billing? Nobody holds it, so no one loses access.')
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete role' }))

    expect(await screen.findByText('Role Billing deleted')).toBeInTheDocument()
    expect(screen.queryByText('Billing', { selector: 'div' })).not.toBeInTheDocument()
    expect(screen.getByText('Role Billing deleted')).toHaveFocus()
  })

  it('leaves a deletion through Cancel, with focus back on its button', async () => {
    renderPage()
    fireEvent.click((await rowOf('Billing')).getByRole('button', { name: 'Delete' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect((async () => (await rowOf('Billing')).getByRole('button', { name: 'Delete' }))()).resolves.toHaveFocus()
    )
  })

  it('creates a role: it appears with the permissions chosen, and the row says so', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Create role' }))
    fireEvent.input(await screen.findByRole('textbox', { name: 'Role name' }), { target: { value: 'support' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Invite people' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'See roles' }))

    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))

    expect(await screen.findByText('Role Support created')).toBeInTheDocument()
    expect((await rowOf('Support')).getByText('2 of 11 permissions')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('edits a role: the row shows the new permissions and says it was saved', async () => {
    renderPage()
    fireEvent.click((await rowOf('Billing')).getByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Add members' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

    expect(await screen.findByText('Role Billing saved')).toBeInTheDocument()
    expect((await rowOf('Billing')).getByText('2 of 11 permissions')).toBeInTheDocument()
  })

  it('opens one form at a time, and closes one from Cancel', async () => {
    renderPage()
    fireEvent.click((await rowOf('Billing')).getByRole('button', { name: 'Edit' }))

    expect(await screen.findByRole('group', { name: 'Edit' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Create role' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('group', { name: 'Edit' })).not.toBeInTheDocument())
  })

  it('offers only to view a role that grants more than the caller holds, and says so', async () => {
    renderPage({ held: { ac: ['create', 'read', 'update', 'delete'], invitation: ['create'] } })

    expect(await buttonsOf('Billing')).toEqual(['View permissions'])
    expect(
      (await rowOf('Billing')).getByText('This role holds permissions you do not, so you can only view it.')
    ).toBeInTheDocument()
    expect(await buttonsOf('Editor')).toEqual(['Edit', 'Delete'])

    fireEvent.click((await rowOf('Billing')).getByRole('button', { name: 'View permissions' }))
    // Said once, in the row: the grid below it does not say it again.
    expect(await screen.findAllByText('This role holds permissions you do not, so you can only view it.')).toHaveLength(
      1
    )
    expect(await screen.findByRole('group', { name: 'Invitations' })).toBeInTheDocument()
  })

  it('shows a plain member the roles to read, without a way to create, edit or delete any', async () => {
    renderPage({ held: builtInRoles.member as Permissions })

    expect(await buttonsOf('Editor')).toEqual(['View permissions'])
    expect(await buttonsOf('Billing')).toEqual(['View permissions'])
    expect(screen.queryByRole('button', { name: 'Create role' })).not.toBeInTheDocument()
    expect(
      screen.queryByText('This role holds permissions you do not, so you can only view it.')
    ).not.toBeInTheDocument()
  })

  it('shows a plain member a role they hold everything of, without a reason to only view it', async () => {
    renderPage({
      held: builtInRoles.member as Permissions,
      roles: [customRole('r3', 'reader', { ac: ['read'] })],
      members: [],
      invitations: []
    })

    fireEvent.click((await rowOf('Reader')).getByRole('button', { name: 'View permissions' }))

    expect(await screen.findByRole('checkbox', { name: 'See roles' })).toBeChecked()
    expect(
      screen.queryByText('This role holds permissions you do not, so you can only view it.')
    ).not.toBeInTheDocument()
  })

  it('has no section of its own roles for a plain member when the organization has none', async () => {
    renderPage({ held: builtInRoles.member as Permissions, roles: [], members: [], invitations: [] })

    expect(await screen.findByRole('region', { name: 'Built-in roles' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Roles of Acme' })).not.toBeInTheDocument()
  })

  it('reads the list again and says so when the role was already gone', async () => {
    let deleted = false
    renderPage({
      auth: async (input) => {
        const url = String(input)
        if (url.includes('/organization/list-members')) return Response.json({ members: [], total: 0 })
        if (url.includes('/organization/list-roles')) {
          return Response.json(deleted ? [] : [customRole('r2', 'billing', { member: ['update'] })])
        }
        if (url.includes('/organization/list-invitations')) return Response.json([])
        if (url.includes('/organization/delete-role')) {
          deleted = true
          return Response.json({ code: 'ROLE_NOT_FOUND' }, { status: 400 })
        }
        return Response.json([acme])
      }
    })
    fireEvent.click((await rowOf('Billing')).getByRole('button', { name: 'Delete' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Delete role' }))

    expect(await screen.findByText('This role no longer exists. The list has been updated.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Billing', { selector: 'div' })).not.toBeInTheDocument())
  })

  it('reads the list again when an edit finds the role gone', async () => {
    let gone = false
    renderPage({
      auth: async (input) => {
        const url = String(input)
        if (url.includes('/organization/list-members')) return Response.json({ members: [], total: 0 })
        if (url.includes('/organization/list-roles')) {
          return Response.json(gone ? [] : [customRole('r2', 'billing', { member: ['update'] })])
        }
        if (url.includes('/organization/list-invitations')) return Response.json([])
        if (url.includes('/organization/update-role')) {
          gone = true
          return Response.json({ code: 'ROLE_NOT_FOUND' }, { status: 400 })
        }
        return Response.json([acme])
      }
    })
    fireEvent.click((await rowOf('Billing')).getByRole('button', { name: 'Edit' }))
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Add members' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save role' }))

    expect(await screen.findByText('This role no longer exists. The list has been updated.')).toBeInTheDocument()
  })

  it('says when the roles could not be read, and tries again when asked', async () => {
    let attempts = 0
    renderPage({
      auth: async (input) => {
        const url = String(input)
        if (url.includes('/organization/list-roles')) {
          attempts += 1
          return attempts === 1
            ? Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
            : Response.json(defaults.roles)
        }
        if (url.includes('/organization/list-members')) return Response.json({ members: [], total: 0 })
        if (url.includes('/organization/list-invitations')) return Response.json([])
        return Response.json([acme])
      }
    })

    expect(
      await screen.findByText('We could not load the roles. Check your connection, then try again.')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Billing', { selector: 'div' })).toBeInTheDocument()
  })

  it('speaks the language of the provider', async () => {
    renderPage({ locale: 'pt-BR' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Papéis' })).toBeInTheDocument()
    expect(await screen.findByText('Proprietário', { selector: 'div' })).toBeInTheDocument()
    expect((await rowOf('Editor')).getByText(/Quem tem: Ken e new@example\.com \(convidado\)/)).toBeInTheDocument()
  })
})
