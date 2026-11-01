import 'virtual:uno.css'
import { render } from 'solid-js/web'
import { loadIdentityOptions } from '#entities/identity-options'
import { createApiClient, createAuthClient } from '#shared/api'
import { detectLocale, loadMessages, readDeviceLocale, readWebEnv } from '#shared/config'
import { reloadOnStaleBuild } from '#shared/lib'
import { App } from './app/app'

reloadOnStaleBuild(window, () => window.location.reload())

const env = readWebEnv(import.meta.env)

const root = document.getElementById('root')
if (!root) throw new Error('Element #root not found')

const fetch = window.fetch.bind(window)
const client = createApiClient({ fetch, baseUrl: env.apiBaseUrl })
const auth = createAuthClient({ fetch })

// The text is the one thing the first screen cannot do without: it waits for the user's language,
// the one chosen on this device or else the browser's (ADR 0028).
// Not a top-level await: it makes the bundler cut the entry in two, for no gain.
const locale = readDeviceLocale() ?? detectLocale(navigator.languages)
// The first paint also waits, a moment at most, for what the API offers for signing in, so the entry
// screens know at once whether to show Google and nothing moves when the answer comes.
Promise.all([loadMessages(locale), loadIdentityOptions(client, 1500)]).then(([, identity]) =>
  render(() => <App client={client} auth={auth} locale={locale} identity={identity} />, root)
)
