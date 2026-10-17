import { createContext, type ParentProps, useContext } from 'solid-js'
import type { createApiClient } from './client'

export type ApiClient = ReturnType<typeof createApiClient>

const ApiContext = createContext<ApiClient>()

export function ApiProvider(props: ParentProps<{ client: ApiClient }>) {
  return <ApiContext.Provider value={props.client}>{props.children}</ApiContext.Provider>
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext)
  if (!client) throw new Error('useApi must be used inside an ApiProvider')
  return client
}
