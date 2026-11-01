import { buttonVariants, cn } from '@repo/ui'
import { Show } from 'solid-js'
import { useI18n } from '#shared/config'
import { mailProviderOf } from '#shared/lib'

export type OpenMailProps = {
  /** The address the email went to: its domain says which inbox to open. */
  email: string
  /** `primary` when opening the inbox is the next step of the screen; `outline` beside another primary action. */
  variant?: 'primary' | 'outline' | undefined
}

/**
 * "Open Gmail" or "Open Outlook", for an address on one of them, in a new tab so the screen waits where
 * it is; nothing for any other address. It saves a trip to the inbox, where the link is.
 */
export function OpenMail(props: OpenMailProps) {
  const { t } = useI18n()

  return (
    <Show when={mailProviderOf(props.email)}>
      {(provider) => (
        <a
          href={provider().url}
          target="_blank"
          rel="noopener noreferrer"
          class={cn(buttonVariants({ variant: props.variant ?? 'primary' }), 'w-full')}
        >
          {t('mail.open', { provider: provider().name })}
          <span class="sr-only">{t('mail.newTab')}</span>
        </a>
      )}
    </Show>
  )
}
