import type { IdentityOptions } from '@repo/contracts'
import { Navigate, Route, Router } from '@solidjs/router'
import { lazy } from 'solid-js'
import { IdentityOptionsProvider } from '#entities/identity-options'
import { ForgotPasswordPage } from '#pages/forgot-password'
import { NotFoundPage } from '#pages/not-found'
import { ResetPasswordPage } from '#pages/reset-password'
import { SignInPage } from '#pages/sign-in'
import { SignUpPage } from '#pages/sign-up'
import { TwoFactorPage } from '#pages/two-factor'
import { type ApiClient, ApiProvider, type AuthClient, AuthProvider } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { AccountRedirect } from './account-redirect'

/**
 * What a visitor needs (the entry screens) is in the first download; what only someone signed in
 * needs (the session guard with the side menu, the menus, the palette and the screens behind it) loads
 * when they get there, so opening the sign-in does not pay for Kobalte's dialogs and menus. The router
 * keeps the page on screen until the next one is ready: no blank flash. The security screen is the
 * heaviest of those (QR code, backup codes, every security form), so it loads on its own.
 */
const RequireSession = lazy(() => import('./require-session').then((m) => ({ default: m.RequireSession })))
const HomePage = lazy(() => import('#pages/home').then((m) => ({ default: m.HomePage })))
const ProfilePage = lazy(() => import('#pages/profile').then((m) => ({ default: m.ProfilePage })))
const PreferencesPage = lazy(() => import('#pages/preferences').then((m) => ({ default: m.PreferencesPage })))
const SecurityPage = lazy(() => import('#pages/security').then((m) => ({ default: m.SecurityPage })))

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
                <Router>
                  <Route path="/" component={RequireSession}>
                    <Route path="/" component={HomePage} />
                    <Route path="/settings">
                      <Route path="/" component={() => <Navigate href="/settings/profile" />} />
                      <Route path="/profile" component={ProfilePage} />
                      <Route path="/security" component={SecurityPage} />
                      <Route path="/preferences" component={PreferencesPage} />
                    </Route>
                  </Route>
                  <Route path="/account" component={AccountRedirect} />
                  <Route path="/signup" component={SignUpPage} />
                  <Route path="/login" component={SignInPage} />
                  <Route path="/login/two-factor" component={TwoFactorPage} />
                  <Route path="/forgot-password" component={ForgotPasswordPage} />
                  <Route path="/reset-password" component={ResetPasswordPage} />
                  <Route path="*404" component={NotFoundPage} />
                </Router>
              </IdentityOptionsProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
