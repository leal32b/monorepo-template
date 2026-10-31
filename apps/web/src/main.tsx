import 'virtual:uno.css'
import { render } from 'solid-js/web'
import { createApiClient, createAuthClient } from '#shared/api'
import { detectLocale, loadMessages, readWebEnv } from '#shared/config'
import { reloadOnStaleBuild } from '#shared/lib'
import { App } from './app/app'

reloadOnStaleBuild(window, () => window.location.reload())

const env = readWebEnv(import.meta.env)

const root = document.getElementById('root')
if (!root) throw new Error('Element #root not found')

const fetch = window.fetch.bind(window)
const client = createApiClient({ fetch, baseUrl: env.apiBaseUrl })
const auth = createAuthClient({ fetch })

// The text is the one thing the first screen cannot do without: it waits for the user's language.
// Not a top-level await: it makes the bundler cut the entry in two, for no gain.
const locale = detectLocale(navigator.languages)
loadMessages(locale).then(() => render(() => <App client={client} auth={auth} locale={locale} />, root))
