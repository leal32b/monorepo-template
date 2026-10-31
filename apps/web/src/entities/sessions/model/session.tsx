import type { MeResponse } from '@repo/contracts'
import { createContext, type ParentProps, useContext } from 'solid-js'

const SessionContext = createContext<MeResponse>()

/** Gives the screens below the user who is signed in; only the session guard puts one up. */
export function SessionProvider(props: ParentProps<{ user: MeResponse }>) {
  return <SessionContext.Provider value={props.user}>{props.children}</SessionContext.Provider>
}

export function useSession(): MeResponse {
  const user = useContext(SessionContext)
  if (!user) throw new Error('useSession must be used inside a SessionProvider')
  return user
}
