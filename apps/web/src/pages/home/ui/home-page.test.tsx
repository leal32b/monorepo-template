import { builtInRoles, type OrganizationMembership, type Permissions } from '@repo/contracts'
import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { CurrentOrganizationProvider, OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider, ThemeProvider } from '#shared/config'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('shows, in the app frame, the translated heading', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
    const client = createApiClient({ fetch: async () => Response.json(health) })

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
    expect(await screen.findByRole('button', { name: /Status do serviço: Tudo funcionando/ })).toBeInTheDocument()
  })

  describe('Getting started', () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

    function renderHome(permissions: Permissions) {
      render(() => (
        <I18nProvider locale="en">
          <ThemeProvider>
            <PaletteProvider>
              <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
                <AuthProvider client={createAuthClient({ fetch: async () => Response.json([]) })}>
                  <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                    <MemoryRouter
                      root={(root) => (
                        <OrganizationsProvider>
                          <CurrentOrganizationProvider
                            organization={{ id: 'org-1', name: 'Acme', slug: 'acme' }}
                            membership={{
                              roles: ['owner'],
                              permissions: permissions as OrganizationMembership['permissions']
                            }}
                          >
                            {root.children}
                          </CurrentOrganizationProvider>
                        </OrganizationsProvider>
                      )}
                    >
                      <Route path="*" component={HomePage} />
                    </MemoryRouter>
                  </SessionProvider>
                </AuthProvider>
              </ApiProvider>
            </PaletteProvider>
          </ThemeProvider>
        </I18nProvider>
      ))
    }

    it('offers whoever may invite a link to invite people, to the members of their organization', () => {
      renderHome(builtInRoles.admin)

      const section = screen.getByRole('region', { name: 'Getting started' })
      expect(section).toHaveTextContent('Ask your team to join Acme.')
      expect(screen.getByRole('link', { name: 'Invite people' })).toHaveAttribute('href', '/acme/settings/members')
    })

    it('offers nothing to someone who may not invite', () => {
      renderHome(builtInRoles.member)

      expect(screen.queryByRole('region', { name: 'Getting started' })).not.toBeInTheDocument()
    })
  })
})
