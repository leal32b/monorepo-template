import { render } from 'solid-js/web'
import { createApiClient } from '#shared/api'
import { App } from './app/app'

const root = document.getElementById('root')
if (!root) throw new Error('Element #root not found')

render(() => <App client={createApiClient({ fetch: window.fetch.bind(window) })} />, root)
