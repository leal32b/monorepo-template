import 'virtual:uno.css'
import { render } from 'solid-js/web'
import { loadIdentityOptions } from '#entities/identity-options'
import { createApiClient, createAuthClient, createRequests, limitReads } from '#shared/api'
import { detectLocale, loadMessages, readDeviceLocale, readWebEnv } from '#shared/config'
import { reloadOnStaleBuild } from '#shared/lib'
import { App } from './app/app'
import { opensOnEntryScreen } from './app/routes'

reloadOnStaleBuild(window, () => window.location.reload())

const env = readWebEnv(import.meta.env)

const root = document.getElementById('root')
if (!root) throw new Error('Element #root not found')

// Every request goes through one counted `fetch`, which the progress bar follows (ADR 0035).
const requests = createRequests()
const fetch = requests.track(limitReads(window.fetch.bind(window)))
const client = createApiClient({ fetch, baseUrl: env.apiBaseUrl })
const auth = createAuthClient({ fetch })

// The text is the one thing the first screen cannot do without: it waits for the user's language,
// the one chosen on this device or else the browser's (ADR 0028).
// Not a top-level await: it makes the bundler cut the entry in two, for no gain.
const locale = readDeviceLocale() ?? detectLocale(navigator.languages)
// An entry screen's first paint also waits, a moment at most, for what the API offers for signing in, so it
// knows at once whether to show Google and nothing moves when the answer comes. The app's screens never
// wait for it (ADR 0038); one that leads to an entry screen later asks there.
const identity = opensOnEntryScreen(window.location.pathname) ? loadIdentityOptions(client, 1500) : undefined
Promise.all([loadMessages(locale), identity]).then(([, options]) =>
  render(() => <App client={client} auth={auth} requests={requests} locale={locale} identity={options} />, root)
)
