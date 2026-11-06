import { createContext, getOwner, type ParentProps, runWithOwner, untrack, useContext } from 'solid-js'
import { createServiceStatus, isProblem, type ServiceStatus } from './service-status'

const ServiceStatusContext = createContext<() => ServiceStatus>()

/**
 * Holds the app's one service status, for every screen that shows it: the entry screens' notice and the
 * frame's status (ADR 0038). The API is asked when the first of them opens, not before, and the answer
 * lives as long as the app.
 */
export function ServiceStatusProvider(props: ParentProps) {
  const owner = getOwner()
  let status: ServiceStatus | undefined
  const shared = () => {
    status ??= runWithOwner(owner, createServiceStatus) as ServiceStatus
    return status
  }

  return <ServiceStatusContext.Provider value={shared}>{props.children}</ServiceStatusContext.Provider>
}

/**
 * The service status a screen shows. In the app it is read once per app session and shared, so moving
 * from the sign-in to the app asks the API once; a problem is asked again by the next screen that shows
 * it, so a notice does not outlive the problem. A screen drawn outside the app, as in its own test, reads
 * its own.
 */
export function useServiceStatus(): ServiceStatus {
  const shared = useContext(ServiceStatusContext)
  if (shared === undefined) return createServiceStatus()
  const status = shared()
  if (untrack(() => isProblem(status.state()))) status.check()
  return status
}
