import 'virtual:uno.css'
import { render } from 'solid-js/web'
import { createApiClient, createAuthClient } from '#shared/api'
import { detectLocale, readWebEnv } from '#shared/config'
import { reloadOnStaleBuild } from '#shared/lib'
import { App } from './app/app'

reloadOnStaleBuild(window, () => window.location.reload())

const env = readWebEnv(import.meta.env)

const root = document.getElementById('root')
if (!root) throw new Error('Element #root not found')

const fetch = window.fetch.bind(window)
const client = createApiClient({ fetch, baseUrl: env.apiBaseUrl })
const auth = createAuthClient({ fetch })

render(() => <App client={client} auth={auth} locale={detectLocale(navigator.languages)} />, root)
