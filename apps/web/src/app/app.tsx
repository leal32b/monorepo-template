import { Route, Router } from '@solidjs/router'
import { HomePage } from '#pages/home'
import { type ApiClient, ApiProvider } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'

export function App(props: { client: ApiClient; locale: Locale }) {
  return (
    <I18nProvider locale={props.locale}>
      <ApiProvider client={props.client}>
        <Router>
          <Route path="/" component={HomePage} />
        </Router>
      </ApiProvider>
    </I18nProvider>
  )
}
