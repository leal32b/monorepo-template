import 'virtual:uno.css'
import { render } from 'solid-js/web'
import { createApiClient } from '#shared/api'
import { detectLocale, readWebEnv } from '#shared/config'
import { App } from './app/app'

const env = readWebEnv(import.meta.env)

const root = document.getElementById('root')
if (!root) throw new Error('Element #root not found')

const client = createApiClient({ fetch: window.fetch.bind(window), baseUrl: env.apiBaseUrl })

render(() => <App client={client} locale={detectLocale(navigator.languages)} />, root)
