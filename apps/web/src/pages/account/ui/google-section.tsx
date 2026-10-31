import { identityOptionsSchema } from '@repo/contracts'
import { createResource, Show } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { LinkGoogle } from '#features/link-google'
import { UnlinkGoogle } from '#features/unlink-google'
import { useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { Section } from './section'

export type GoogleSectionProps = {
  security: AccountSecurity
  /** What linking Google came back with in `?error=`, if anything. */
  error?: string | string[] | undefined
  /** Called with the account's security once Google was unlinked. */
  onChange: (security: AccountSecurity) => void
}

/**
 * Google as a way to sign in: linked here while the API has Google on, and unlinked while another way
 * remains, the password. It comes last on the page, so appearing once the API answers moves nothing.
 * Once unlinked, focus moves to the state, as in the other sections.
 */
export function GoogleSection(props: GoogleSectionProps) {
  const api = useApi()
  const { t } = useI18n()
  const [options] = createResource(() => api.get('/api/identity/options', identityOptionsSchema))
  let state!: HTMLParagraphElement

  const linked = () => props.security.googleAccountId !== undefined

  return (
    <Show when={linked() || (options.state === 'ready' && options().google)}>
      <Section id="google" title={t('account.google.title')}>
        <p
          ref={(element) => {
            state = element
          }}
          tabIndex={-1}
          class="outline-none"
        >
          {!linked()
            ? t('account.google.unlinked')
            : props.security.password
              ? t('account.google.linked')
              : t('account.google.only')}
        </p>
        <Show
          when={props.security.googleAccountId}
          fallback={<LinkGoogle email={props.security.email} error={props.error} />}
        >
          {(accountId) => (
            <Show when={props.security.password}>
              <UnlinkGoogle
                accountId={accountId()}
                onUnlinked={() => {
                  props.onChange({ ...props.security, googleAccountId: undefined })
                  state.focus()
                }}
              />
            </Show>
          )}
        </Show>
      </Section>
    </Show>
  )
}
