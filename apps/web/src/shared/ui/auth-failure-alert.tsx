import { Alert } from '@repo/ui'
import { type JSX, onMount } from 'solid-js'
import type { AuthFailure } from '#shared/api'
import { useI18n } from '#shared/config'

export type AuthFailureAlertProps = {
  failure: AuthFailure
  /** The screen's own words for this failure, when it has them: they replace the generic ones. */
  message?: string | undefined
  /** What the user can do next, such as sending a link again. */
  action?: JSX.Element
}

/** The three things a screen can say about a failure it has no better words for. */
function kindOf({ status }: AuthFailure) {
  if (status === undefined) return 'network'
  if (status === 429) return 'rateLimited'
  return 'unexpected'
}

/**
 * Says what went wrong with a call to Better Auth: in the screen's own words when it has them;
 * otherwise the API out of reach, too many attempts, or anything else, with the code and request id
 * support needs to find it. It takes focus when it appears, so the keyboard goes on from the message.
 */
export function AuthFailureAlert(props: AuthFailureAlertProps) {
  const { t } = useI18n()

  const reference = () => {
    const parts = [props.failure.code, props.failure.requestId].filter(Boolean)
    return props.message === undefined && kindOf(props.failure) === 'unexpected' && parts.length > 0
      ? t('failure.reference', { reference: parts.join(' · ') })
      : undefined
  }

  return (
    <Alert
      variant="error"
      reference={reference()}
      action={props.action}
      tabIndex={-1}
      ref={(alert) => onMount(() => alert.focus())}
      class="outline-none"
    >
      {props.message ?? t(`failure.${kindOf(props.failure)}`)}
    </Alert>
  )
}
