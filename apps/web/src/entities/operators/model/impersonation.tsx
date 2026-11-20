import type { Impersonation } from '@repo/contracts'
import { type Accessor, createContext, createSignal, type ParentProps, useContext } from 'solid-js'
import { useApi } from '#shared/api'
import { getImpersonation } from '../api/back-office-api'
import { forgetImpersonation, hasImpersonation, rememberImpersonation } from './impersonation-hint'

type ImpersonationState = {
  /** The operator's visit now, `null` with none, `undefined` while the back office is asked. */
  current: Accessor<Impersonation | null | undefined>
  /** A visit started (the answer of the back office) or ended (`null`), kept on this device's hint too. */
  set: (visit: Impersonation | null) => void
}

const ImpersonationContext = createContext<ImpersonationState>({ current: () => null, set: () => undefined })

/**
 * The operator's visit to an organization, for every screen behind the session (ADR 0077): the banner, the
 * tenant frame that adds the organization the operator is no member of, and the side menu. The back office is
 * asked only where this device started a visit; any failure (a 404 for whoever is not an operator) is no visit.
 */
export function ImpersonationProvider(props: ParentProps) {
  const api = useApi()
  // A signal, not a resource: no screen waits under a boundary for it, and only the tenant frame asks for it.
  const [visit, setVisit] = createSignal<Impersonation | null | undefined>(hasImpersonation() ? undefined : null)
  const set = (next: Impersonation | null) => {
    if (next === null) forgetImpersonation()
    else rememberImpersonation()
    setVisit(next)
  }
  if (visit() === undefined) {
    getImpersonation(api).then(
      ({ impersonation }) => set(impersonation),
      () => set(null)
    )
  }
  return <ImpersonationContext.Provider value={{ current: visit, set }}>{props.children}</ImpersonationContext.Provider>
}

/** The visit now; outside the provider, none. */
export function useImpersonation(): ImpersonationState {
  return useContext(ImpersonationContext)
}
