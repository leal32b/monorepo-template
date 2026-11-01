import { createMemo, createResource } from 'solid-js'
import { getHealth } from '#entities/health'
import { ApiError, useApi } from '#shared/api'

export type ServiceState = 'checking' | 'ok' | 'degraded' | 'unreachable' | 'unexpected' | 'error'

/** What the app knows of the service: its state, when it answered, and what support needs to find a failure. */
export type ServiceStatus = ReturnType<typeof createServiceStatus>

/** The state a failed health check amounts to. */
function stateOfFailure(error: unknown): ServiceState {
  if (!(error instanceof ApiError)) return 'unexpected'
  switch (error.kind) {
    case 'network':
      return 'unreachable'
    case 'contract':
      return 'unexpected'
    case 'http':
      return 'error'
  }
}

/**
 * Asks the API whether it is up, once when the shell opens and again on `check()`. A problem is a
 * state to say in words, never a thrown error: `reference` holds the code and request id of an
 * error the API answered, for the user to quote.
 */
export function createServiceStatus() {
  const api = useApi()
  const [health, { refetch }] = createResource(() => getHealth(api))

  const state = createMemo<ServiceState>(() => {
    if (health.error && !health.loading) return stateOfFailure(health.error)
    const answer = health.loading ? undefined : health()
    return answer?.status ?? 'checking'
  })

  const checkedAt = () => (health.error || health.loading ? undefined : health()?.timestamp)

  const reference = () => {
    const error: unknown = health.error
    if (!(error instanceof ApiError) || !error.problem) return undefined
    return [error.problem.code, error.problem.requestId].filter(Boolean).join(' · ')
  }

  return { state, checkedAt, reference, check: () => refetch() }
}
