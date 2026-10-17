import { createResource, Match, Switch } from 'solid-js'
import { getHealth } from '#entities/health'
import { ApiError, useApi } from '#shared/api'

function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong.'
  switch (error.kind) {
    case 'network':
      return 'Cannot reach the API.'
    case 'contract':
      return 'The API answered something unexpected.'
    case 'http':
      return error.problem ? `The API answered an error (${error.problem.code}).` : 'The API answered an error.'
  }
}

/** Asks the API whether it is up and shows the answer, or why it could not be had. */
export function ApiStatus() {
  const api = useApi()
  const [health] = createResource(() => getHealth(api))

  return (
    <Switch fallback={<p role="status">Checking the API…</p>}>
      <Match when={health.error}>{(error) => <p role="alert">{describe(error())}</p>}</Match>
      <Match when={health()}>
        {(data) => (
          <p role="status">
            The API is up: {data().service} at {data().timestamp}
          </p>
        )}
      </Match>
    </Switch>
  )
}
