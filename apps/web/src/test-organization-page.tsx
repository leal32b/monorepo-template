import { builtInRoles, type OrganizationMembership, type Permissions } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { render } from '@solidjs/testing-library'
import type { Component, ParentProps } from 'solid-js'
import { CurrentOrganizationProvider, type Organization, OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { membershipOf } from './test-membership'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

/** The organization the page tests are in, unless one says another. */
export const acme: Organization = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' }

export type OrganizationPageOptions = {
  /** The screen under test. */
  page: Component
  /** Where the screen is mounted under `/:orgSlug`, as its route declares it: `/customers`, `/settings/roles`. */
  path: string
  /** Where the history starts, when the test is about the URL's query: `/acme${path}` unless said. */
  at?: string
  /** The organization of the URL; `acme` unless the test is about another. */
  organization?: Organization
  /** What the caller holds in it; the owner on trial unless the test is about a role or the plan. */
  membership?: OrganizationMembership
  /** The product API: answers `null` to everything unless the screen reads from it. */
  api?: Fetch
  /** Better Auth: answers the organization list with `organization` unless the screen asks it more. */
  auth?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  locale?: Locale
  /** Who is signed in. */
  user?: { id: string; email: string; name: string }
}

/**
 * Draws a tenant screen the way the app does, for a page test: the providers every screen reads from
 * (language, theme, palette, API, auth, session), the router with the organization in the URL, and the
 * caller's membership (ADR 0017). A page test then writes only its own fake API and its own expectations.
 * Returns the history, to read where the screen sent the user, and `refresh`, the spy the organization's
 * membership is read again through.
 */
export function renderOrganizationPage({
  page,
  path,
  at,
  organization = acme,
  membership = membershipOf(['owner'], builtInRoles.owner as Permissions),
  api = async () => Response.json(null),
  auth = async () => Response.json([organization]),
  locale = 'en',
  user = { id: 'u1', email: 'ada@example.com', name: 'Ada' }
}: OrganizationPageOptions) {
  const refresh = vi.fn(async () => undefined)
  const history = createMemoryHistory()
  history.set({ value: at ?? `/${organization.slug}${path}` })
  render(() => (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: api })}>
            <AuthProvider client={createAuthClient({ fetch: auth })}>
              <SessionProvider user={user}>
                <MemoryRouter history={history}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route
                      path="/:orgSlug"
                      component={(props: ParentProps) => (
                        <CurrentOrganizationProvider
                          organization={organization}
                          membership={membership}
                          refresh={refresh}
                        >
                          {props.children}
                        </CurrentOrganizationProvider>
                      )}
                    >
                      <Route path={path} component={page} />
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
  return { history, refresh }
}
