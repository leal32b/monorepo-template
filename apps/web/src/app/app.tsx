import { Route, Router } from '@solidjs/router'
import { ForgotPasswordPage } from '#pages/forgot-password'
import { HomePage } from '#pages/home'
import { ResetPasswordPage } from '#pages/reset-password'
import { SignInPage } from '#pages/sign-in'
import { SignUpPage } from '#pages/sign-up'
import { TwoFactorPage } from '#pages/two-factor'
import { type ApiClient, ApiProvider, type AuthClient, AuthProvider } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import { RequireSession } from './require-session'

export function App(props: { client: ApiClient; auth: AuthClient; locale: Locale }) {
  return (
    <I18nProvider locale={props.locale}>
      <ApiProvider client={props.client}>
        <AuthProvider client={props.auth}>
          <Router>
            <Route path="/" component={RequireSession}>
              <Route path="/" component={HomePage} />
            </Route>
            <Route path="/signup" component={SignUpPage} />
            <Route path="/login" component={SignInPage} />
            <Route path="/login/two-factor" component={TwoFactorPage} />
            <Route path="/forgot-password" component={ForgotPasswordPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
          </Router>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  )
}
