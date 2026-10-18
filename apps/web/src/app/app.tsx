import { Route, Router } from '@solidjs/router'
import { HomePage } from '#pages/home'
import { type ApiClient, ApiProvider } from '#shared/api'

export function App(props: { client: ApiClient }) {
  return (
    <ApiProvider client={props.client}>
      <Router>
        <Route path="/" component={HomePage} />
      </Router>
    </ApiProvider>
  )
}
