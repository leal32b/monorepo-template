import type { IdentityOptions } from '@repo/contracts'
import { Router } from '@solidjs/router'
import { IdentityOptionsProvider } from '#entities/identity-options'
import {
  type ApiClient,
  ApiProvider,
  type AuthClient,
  AuthProvider,
  createErrorReporter,
  createRequests,
  type ErrorReporter,
  ErrorReporterProvider,
  type Requests
} from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { AppRoot } from './app-root'
import { routes } from './routes'

export function App(props: {
  client: ApiClient
  auth: AuthClient
  /** The requests both clients make, which the progress bar follows. Without it, the bar never shows. */
  requests?: Requests
  /** Where an error nobody handled is reported (ADR 0072). Without it, nothing is sent. */
  reporter?: ErrorReporter
  locale: Locale
  /** What the API offers for signing in, if it answered at start-up (`loadIdentityOptions`). */
  identity?: IdentityOptions | undefined
}) {
  const requests = props.requests ?? createRequests()
  const reporter = props.reporter ?? createErrorReporter({ send: () => undefined, release: 'dev' })
  return (
    <ThemeProvider>
      <I18nProvider locale={props.locale}>
        <PaletteProvider>
          <ApiProvider client={props.client}>
            <AuthProvider client={props.auth}>
              <IdentityOptionsProvider options={props.identity}>
                <ErrorReporterProvider reporter={reporter}>
                  <Router
                    root={(root) => (
                      <AppRoot requests={requests} reporter={reporter}>
                        {root.children}
                      </AppRoot>
                    )}
                  >
                    {routes}
                  </Router>
                </ErrorReporterProvider>
              </IdentityOptionsProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
