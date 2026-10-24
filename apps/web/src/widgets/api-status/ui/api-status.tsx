import { createResource, Match, Switch } from 'solid-js'
import { getHealth } from '#entities/health'
import { ApiError, useApi } from '#shared/api'
import { useI18n } from '#shared/config'

/** Asks the API whether it is up and shows the answer, or why it could not be had. */
export function ApiStatus() {
  const api = useApi()
  const { t } = useI18n()
  const [health] = createResource(() => getHealth(api))

  const describe = (error: unknown): string => {
    if (!(error instanceof ApiError)) return t('apiStatus.unknown')
    switch (error.kind) {
      case 'network':
        return t('apiStatus.unreachable')
      case 'contract':
        return t('apiStatus.unexpected')
      case 'http':
        return error.problem ? t('apiStatus.errorWithCode', { code: error.problem.code }) : t('apiStatus.error')
    }
  }

  return (
    <Switch fallback={<p role="status">{t('apiStatus.checking')}</p>}>
      <Match when={health.error}>{(error) => <p role="alert">{describe(error())}</p>}</Match>
      <Match when={health()}>
        {(data) => <p role="status">{t('apiStatus.up', { service: data().service, timestamp: data().timestamp })}</p>}
      </Match>
    </Switch>
  )
}
