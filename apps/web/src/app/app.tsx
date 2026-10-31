import { Route, Router } from '@solidjs/router'
import { HomePage } from '#pages/home'
import { type ApiClient, ApiProvider, type AuthClient, AuthProvider } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'

export function App(props: { client: ApiClient; auth: AuthClient; locale: Locale }) {
  return (
    <I18nProvider locale={props.locale}>
      <ApiProvider client={props.client}>
        <AuthProvider client={props.auth}>
          <Router>
            <Route path="/" component={HomePage} />
          </Router>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  )
}
