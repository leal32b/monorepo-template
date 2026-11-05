import { Alert } from '@repo/ui'
import { Show } from 'solid-js'
import type { AuthFailure } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

const failureTexts = {
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: 'invitations.errors.full'
} as const

/**
 * Why an answer did not go through: an organization with no room left, in words that say what to do
 * next (an invitation that closed meanwhile is read again by the screen instead); anything else is the generic failure.
 */
export function AnswerFailure(props: { failure: AuthFailure }) {
  const { t } = useI18n()
  const key = () => failureTexts[props.failure.code as keyof typeof failureTexts]

  return (
    <Show when={key()} fallback={<AuthFailureAlert failure={props.failure} />}>
      {(current) => <Alert variant="error">{t(current())}</Alert>}
    </Show>
  )
}
