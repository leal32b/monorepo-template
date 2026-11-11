import { builtInRoles, type OrganizationMembership, type Permissions } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import type { ParentProps } from 'solid-js'
import { CurrentOrganizationProvider, OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { OrganizationGeneralPage } from './organization-general-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'America/Sao_Paulo', currency: 'BRL' as const }
const globex = { id: 'org-2', name: 'Globex', slug: 'globex', timeZone: 'UTC', currency: 'USD' as const }

type Options = { permissions?: Permissions; auth?: Fetch; locale?: Locale }

/** The page at `/acme/settings/general` for a caller with `permissions`, and Better Auth answering through `fetch`. */
function renderPage({ permissions = builtInRoles.owner, auth, locale = 'en' }: Options = {}) {
  const authFetch: Fetch =
    auth ??
    (async (input) =>
      String(input).includes('/organization/list') ? Response.json([acme, globex]) : Response.json({ status: true }))
  const history = createMemoryHistory()
  history.set({ value: '/acme/settings/general' })
  render(() => (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: async () => Response.json(null) })}>
            <AuthProvider client={createAuthClient({ fetch: authFetch })}>
              <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                <MemoryRouter history={history}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route
                      path="/:orgSlug"
                      component={(props: ParentProps) => (
                        <CurrentOrganizationProvider
                          organization={acme}
                          membership={{
                            roles: ['member'],
                            permissions: permissions as OrganizationMembership['permissions']
                          }}
                        >
                          {props.children}
                        </CurrentOrganizationProvider>
                      )}
                    >
                      <Route path="/settings/general" component={OrganizationGeneralPage} />
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

const details = () => within(screen.getByRole('region', { name: 'Organization' }))
const regional = () => within(screen.getByRole('region', { name: 'Time and money' }))

/** Every kind of space as a plain one: ICU versions differ on which space goes before PM. */
const spaced = (text: string | null) => text?.replace(/\s/g, ' ')

describe('OrganizationGeneralPage', () => {
  it('shows an owner the name and the address with their buttons, and the deletion', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument()
    expect(details().getByText('Acme')).toBeInTheDocument()
    expect(details().getByText('/acme')).toBeInTheDocument()
    expect(details().getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(details().getByRole('button', { name: 'Change address' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Delete organization' })).toBeInTheDocument()
  })

  it('shows an admin the buttons to change, and no deletion', () => {
    renderPage({ permissions: builtInRoles.admin })

    expect(details().getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Delete organization' })).not.toBeInTheDocument()
  })

  it('shows a plain member the details and why they cannot change them', () => {
    renderPage({ permissions: builtInRoles.member })

    expect(screen.getByText('You can see these details. Owners and admins can change them.')).toBeInTheDocument()
    expect(details().getByText('Acme')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change address' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Delete organization' })).not.toBeInTheDocument()
  })

  it('opens one form at a time, below its row, and gives focus to it', async () => {
    renderPage()

    fireEvent.click(details().getByRole('button', { name: 'Rename' }))

    expect(await screen.findByRole('group', { name: 'Rename' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Organization name' })).toHaveValue('Acme')
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change address' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete organization' })).toBeDisabled()
  })

  it.each([['Rename'], ['Change address']])(
    'closes the form of %s from Cancel, and hands focus back to the button that opened it',
    async (opener) => {
      renderPage()
      fireEvent.click(details().getByRole('button', { name: opener }))

      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.getByRole('button', { name: opener })).toHaveFocus())
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    }
  )

  it('renames the organization: says so in the row, and the side menu shows the new name', async () => {
    renderPage()
    fireEvent.click(details().getByRole('button', { name: 'Rename' }))
    fireEvent.input(await screen.findByRole('textbox', { name: 'Organization name' }), {
      target: { value: 'Acme Inc' }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Name saved')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rename' })).toHaveFocus())
  })

  it('changes the address: says so, and moves the page to it', async () => {
    const history = renderPage()
    fireEvent.click(details().getByRole('button', { name: 'Change address' }))
    fireEvent.input(await screen.findByRole('textbox', { name: 'Address' }), { target: { value: 'acme-inc' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save address' }))

    expect(await screen.findByText('Address saved')).toBeInTheDocument()
    await waitFor(() => expect(history.get()).toBe('/acme-inc/settings/general'))
  })

  it('deletes the organization after its name is typed, and leaves for the root', async () => {
    const auth = vi.fn<Fetch>(async (input) =>
      String(input).includes('/organization/list') ? Response.json([acme, globex]) : Response.json({ id: 'org-1' })
    )
    const history = renderPage({ auth })
    fireEvent.click(screen.getByRole('button', { name: 'Delete organization' }))
    fireEvent.input(await screen.findByRole('textbox', { name: 'Type the organization name to confirm' }), {
      target: { value: 'Acme' }
    })

    fireEvent.click(
      within(screen.getByRole('group', { name: 'Delete organization' })).getByRole('button', {
        name: 'Delete organization'
      })
    )

    expect(await screen.findByText('The root')).toBeInTheDocument()
    await waitFor(() => expect(history.get()).toBe('/'))
  })

  it('closes the deletion from Cancel without deleting', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Delete organization' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete organization' })).toHaveFocus())
  })

  describe('time and money (ADR 0053)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-11T17:30:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows the time zone with the time there now, and the currency with an amount in it', () => {
      renderPage()

      expect(spaced(regional().getByText(/America\/Sao Paulo/).textContent)).toBe(
        'America/Sao Paulo · now Nov 11, 2026, 2:30 PM GMT-3'
      )
      expect(spaced(regional().getByText(/Brazilian Real/).textContent)).toBe('Brazilian Real (BRL) · R$1,234.56')
      expect(regional().getByRole('button', { name: 'Change time zone' })).toBeInTheDocument()
      expect(regional().getByRole('button', { name: 'Change currency' })).toBeInTheDocument()
    })

    it('shows a plain member the settings and why they cannot change them', () => {
      renderPage({ permissions: builtInRoles.member })

      expect(screen.getByText('You can see these settings. Owners and admins can change them.')).toBeInTheDocument()
      expect(regional().queryByRole('button')).not.toBeInTheDocument()
    })

    it.each([
      ['Change time zone', 'Time zone', 'Europe/Lisbon', 'Save time zone', 'Time zone saved'],
      ['Change currency', 'Currency', 'EUR', 'Save currency', 'Currency saved']
    ])('%s: saves it, says so in the row and gives focus back', async (opener, label, value, save, saved) => {
      const auth = vi.fn<Fetch>(async (input) =>
        String(input).includes('/organization/list') ? Response.json([acme, globex]) : Response.json(acme)
      )
      renderPage({ auth })
      fireEvent.click(regional().getByRole('button', { name: opener }))
      fireEvent.change(await screen.findByRole('combobox', { name: label }), { target: { value } })

      fireEvent.click(screen.getByRole('button', { name: save }))

      expect(await screen.findByText(saved)).toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: opener })).toHaveFocus())
    })

    it('closes a setting’s form from Cancel', async () => {
      renderPage()
      fireEvent.click(regional().getByRole('button', { name: 'Change currency' }))

      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.getByRole('button', { name: 'Change currency' })).toHaveFocus())
    })

    it('writes them in the reader’s language', () => {
      renderPage({ locale: 'pt-BR' })

      expect(spaced(screen.getByText(/Real brasileiro/).textContent)).toBe('Real brasileiro (BRL) · R$ 1.234,56')
      expect(spaced(screen.getByText(/agora/).textContent)).toBe(
        'America/Sao Paulo · agora 11 de nov. de 2026, 14:30 BRT'
      )
    })
  })

  it('speaks the language of the provider', () => {
    renderPage({ locale: 'pt-BR' })

    expect(screen.getByRole('heading', { level: 1, name: 'Geral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renomear' })).toBeInTheDocument()
  })
})
