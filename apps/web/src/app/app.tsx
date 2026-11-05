import type { IdentityOptions } from '@repo/contracts'
import { ProgressBar } from '@repo/ui'
import { Router } from '@solidjs/router'
import { IdentityOptionsProvider } from '#entities/identity-options'
import { type ApiClient, ApiProvider, type AuthClient, AuthProvider, createRequests, type Requests } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { routes } from './routes'

export function App(props: {
  client: ApiClient
  auth: AuthClient
  /** The requests both clients make, which the progress bar follows. Without it, the bar never shows. */
  requests?: Requests
  locale: Locale
  /** What the API offers for signing in, if it answered at start-up (`loadIdentityOptions`). */
  identity?: IdentityOptions | undefined
}) {
  const requests = props.requests ?? createRequests()
  return (
    <ThemeProvider>
      <ProgressBar active={requests.busy()} />
      <I18nProvider locale={props.locale}>
        <PaletteProvider>
          <ApiProvider client={props.client}>
            <AuthProvider client={props.auth}>
              <IdentityOptionsProvider options={props.identity}>
                <Router>{routes}</Router>
              </IdentityOptionsProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
