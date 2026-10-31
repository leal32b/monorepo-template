import { createContext, type ParentProps, useContext } from 'solid-js'
import type { AuthClient } from './auth-client'

const AuthContext = createContext<AuthClient>()

export function AuthProvider(props: ParentProps<{ client: AuthClient }>) {
  return <AuthContext.Provider value={props.client}>{props.children}</AuthContext.Provider>
}

export function useAuth(): AuthClient {
  const client = useContext(AuthContext)
  if (!client) throw new Error('useAuth must be used inside an AuthProvider')
  return client
}
