import type { Impersonation } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route, useLocation } from '@solidjs/router'
import { render } from '@solidjs/testing-library'
import type { Component, JSX } from 'solid-js'
import { ImpersonationProvider } from '#entities/impersonations'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'

/** Where a screen sent the operator, outside the routes under test. */
function Elsewhere() {
  const location = useLocation()
  return <p>Elsewhere: {location.pathname}</p>
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>

/** An operator's visit to Acme, ending at noon and a half (ADR 0077). */
export const visitToAcme: Impersonation = {
  organization: { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' },
  startedAt: '2026-11-20T12:00:00.000Z',
  endsAt: '2026-11-20T12:30:00.000Z'
}

/** A problem of the API, with its status. */
export const problem = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  Response.json({ type: `urn:problem:${code}`, title: 'x', status, code, ...extra }, { status })

/**
 * Draws back office screens the way the app does (ADR 0077): the providers (language, theme, palette, API,
 * auth, the operator's visit) and the router, with `routes` mounted and the history at `at`. Returns the
 * history, to read where a screen sent the operator.
 */
export function renderBackOffice({
  at,
  routes,
  api,
  auth,
  locale = 'en'
}: {
  at: string
  routes: { path: string; component: Component }[]
  api: Fetch
  auth?: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined
  locale?: Locale
}) {
  const history = createMemoryHistory()
  history.set({ value: at })
  render(() => (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: api })}>
            <AuthProvider client={createAuthClient({ fetch: auth ?? (async () => Response.json({ success: true })) })}>
              <ImpersonationProvider>
                <MemoryRouter history={history}>
                  {
                    routes.map((route) => (
                      <Route path={route.path} component={route.component} />
                    )) as unknown as JSX.Element
                  }
                  <Route path="*" component={Elsewhere} />
                </MemoryRouter>
              </ImpersonationProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
  return history
}
