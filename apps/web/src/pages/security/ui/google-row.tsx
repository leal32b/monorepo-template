import { identityOptionsSchema } from '@repo/contracts'
import { Badge, SettingsRow } from '@repo/ui'
import { createResource, createSignal, Show } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { LinkGoogle, LinkGoogleError } from '#features/link-google'
import { UnlinkGoogle, UnlinkGoogleFailure } from '#features/unlink-google'
import { type AuthFailure, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type GoogleRowProps = {
  security: AccountSecurity
  /** What linking Google came back with in `?error=`, if anything. */
  error?: string | string[] | undefined
  /** Called with the account's security once Google was unlinked. */
  onChange: (security: AccountSecurity) => void
}

/**
 * Google as a way to sign in: linked here while the API has Google on, and unlinked, with no
 * confirmation, while another way remains, the password; the row says it can be linked again. An
 * account that signs in with Google alone has no unlink. Problems show below the row, and a change
 * is said in it.
 */
export function GoogleRow(props: GoogleRowProps) {
  const api = useApi()
  const { t } = useI18n()
  const [options] = createResource(() => api.get('/api/identity/options', identityOptionsSchema))
  const [status, setStatus] = createSignal<string>()
  const [linkFailure, setLinkFailure] = createSignal<AuthFailure>()
  const [unlinkFailure, setUnlinkFailure] = createSignal<AuthFailure>()
  let row!: HTMLDivElement

  const linked = () => props.security.googleAccountId !== undefined
  const code = () => (typeof props.error === 'string' && !linked() ? props.error : undefined)
  const problem = () => linkFailure() ?? unlinkFailure() ?? code()

  return (
    <Show when={linked() || (options.state === 'ready' && options().google)}>
      <SettingsRow
        ref={(element) => {
          row = element
        }}
        icon="google"
        title={t('account.google.title')}
        badge={
          linked() ? (
            <Badge variant="success" dot>
              {t('account.badge.linked')}
            </Badge>
          ) : (
            <Badge>{t('account.badge.notLinked')}</Badge>
          )
        }
        description={
          !linked()
            ? t('account.google.unlinked')
            : props.security.password
              ? t('account.google.linked')
              : t('account.google.only')
        }
        status={status()}
        action={
          props.security.googleAccountId ? (
            props.security.password ? (
              <UnlinkGoogle
                accountId={props.security.googleAccountId}
                onUnlinked={() => {
                  setUnlinkFailure(undefined)
                  setStatus(t('account.google.unlinkedDone'))
                  props.onChange({ ...props.security, googleAccountId: undefined })
                  // The button that was pressed is gone: focus goes to the one that took its place.
                  queueMicrotask(() => row.querySelector('button')?.focus())
                }}
                onFailure={(failed) => {
                  setStatus(undefined)
                  setUnlinkFailure(failed)
                }}
              />
            ) : undefined
          ) : (
            <LinkGoogle
              onFailure={(failed) => {
                setStatus(undefined)
                setLinkFailure(failed)
              }}
            />
          )
        }
        panel={
          problem() ? (
            <>
              <Show when={unlinkFailure()}>{(failed) => <UnlinkGoogleFailure failure={failed()} />}</Show>
              <Show when={linkFailure()}>{(failed) => <AuthFailureAlert failure={failed()} />}</Show>
              <Show when={code()}>
                {(current) => <LinkGoogleError email={props.security.email} error={current()} />}
              </Show>
            </>
          ) : undefined
        }
      />
    </Show>
  )
}
