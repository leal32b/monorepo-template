import { builtInRoles, type OrganizationMembership, type Permissions } from '@repo/contracts'
import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider, ThemeProvider } from '#shared/config'
import { membershipOf } from '../../../test-membership'
import { renderOrganizationPage } from '../../../test-organization-page'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('shows, in the app frame, the translated heading', async () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })

    render(() => (
      <I18nProvider locale="pt-BR">
        <ThemeProvider>
          <PaletteProvider>
            <ApiProvider client={client}>
              <AuthProvider client={createAuthClient({ fetch: async () => Response.json(null) })}>
                <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                  <MemoryRouter>
                    <Route path="*" component={HomePage} />
                  </MemoryRouter>
                </SessionProvider>
              </AuthProvider>
            </ApiProvider>
          </PaletteProvider>
        </ThemeProvider>
      </I18nProvider>
    ))

    expect(screen.getByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Início')
  })

  describe('Getting started', () => {
    function renderHome(permissions: Permissions) {
      renderOrganizationPage({
        page: HomePage,
        path: '/',
        user: { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' },
        membership: membershipOf(['owner'], permissions as OrganizationMembership['permissions'])
      })
    }

    it('offers whoever may invite a link to invite people, to the members of their organization', () => {
      renderHome(builtInRoles.admin)

      const section = screen.getByRole('region', { name: 'Getting started' })
      expect(section).toHaveTextContent('Ask your team to join Acme.')
      expect(screen.getByRole('link', { name: 'Invite people' })).toHaveAttribute('href', '/acme/settings/members')
    })

    it('tells someone who may not invite that there is nothing here yet, rather than a blank page', () => {
      renderHome(builtInRoles.member)

      expect(screen.queryByRole('region', { name: 'Getting started' })).not.toBeInTheDocument()
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
      expect(screen.getByText(/will show up here\./)).toBeInTheDocument()
    })
  })
})
