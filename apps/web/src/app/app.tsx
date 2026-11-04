import type { IdentityOptions } from '@repo/contracts'
import { Router } from '@solidjs/router'
import { IdentityOptionsProvider } from '#entities/identity-options'
import { type ApiClient, ApiProvider, type AuthClient, AuthProvider } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { routes } from './routes'

export function App(props: {
  client: ApiClient
  auth: AuthClient
  locale: Locale
  /** What the API offers for signing in, if it answered at start-up (`loadIdentityOptions`). */
  identity?: IdentityOptions | undefined
}) {
  return (
    <ThemeProvider>
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
