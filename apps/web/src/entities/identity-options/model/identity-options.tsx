import type { IdentityOptions } from '@repo/contracts'
import { createContext, createResource, type ParentProps, useContext } from 'solid-js'
import { useApi } from '#shared/api'
import { getIdentityOptions } from '../api/get-identity-options'

const IdentityOptionsContext = createContext<IdentityOptions>()

/** Gives the screens the options the app asked for at start-up (`loadIdentityOptions`), when it got them. */
export function IdentityOptionsProvider(props: ParentProps<{ options: IdentityOptions | undefined }>) {
  // Without options there is nothing to give: the screens ask for themselves.
  return props.options ? (
    <IdentityOptionsContext.Provider value={props.options}>{props.children}</IdentityOptionsContext.Provider>
  ) : (
    props.children
  )
}

/**
 * Whether the API has Google on: `true` or `false`, and `undefined` while it is not known. It is known
 * from the first paint when the app asked at start-up; otherwise the screen asks, and a failure counts
 * as "off", so a screen never waits on it for good.
 */
export function useIdentityOptions(): () => IdentityOptions | undefined {
  const given = useContext(IdentityOptionsContext)
  if (given) return () => given

  const api = useApi()
  const [asked] = createResource(() => getIdentityOptions(api))
  return () => (asked.error ? { google: false } : asked())
}
