import { Route, Router } from '@solidjs/router'
import { lazy } from 'solid-js'
import { ForgotPasswordPage } from '#pages/forgot-password'
import { HomePage } from '#pages/home'
import { NotFoundPage } from '#pages/not-found'
import { ResetPasswordPage } from '#pages/reset-password'
import { SignInPage } from '#pages/sign-in'
import { SignUpPage } from '#pages/sign-up'
import { TwoFactorPage } from '#pages/two-factor'
import { type ApiClient, ApiProvider, type AuthClient, AuthProvider } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import { RequireSession } from './require-session'

/**
 * The account screen is rare and the heaviest (QR code, backup codes, every security form), so it
 * loads when someone opens it. The router keeps the page on screen until it is ready: no blank flash.
 */
const AccountPage = lazy(() => import('#pages/account').then((m) => ({ default: m.AccountPage })))

export function App(props: { client: ApiClient; auth: AuthClient; locale: Locale }) {
  return (
    <I18nProvider locale={props.locale}>
      <ApiProvider client={props.client}>
        <AuthProvider client={props.auth}>
          <Router>
            <Route path="/" component={RequireSession}>
              <Route path="/" component={HomePage} />
              <Route path="/account" component={AccountPage} />
            </Route>
            <Route path="/signup" component={SignUpPage} />
            <Route path="/login" component={SignInPage} />
            <Route path="/login/two-factor" component={TwoFactorPage} />
            <Route path="/forgot-password" component={ForgotPasswordPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route path="*404" component={NotFoundPage} />
          </Router>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  )
}
