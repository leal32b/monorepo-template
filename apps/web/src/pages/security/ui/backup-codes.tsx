import { Button, buttonVariants, cn } from '@repo/ui'
import { createSignal, For, onMount, Show } from 'solid-js'
import { useI18n } from '#shared/config'

export type BackupCodesProps = {
  codes: string[]
  /** The account they belong to, named in the file. */
  email: string
  /** What just happened, such as two-step verification turned on; it takes focus. */
  message: string
  /** Called once the user says the codes are saved. */
  onSaved: () => void
}

/**
 * Backup codes, shown once: Better Auth keeps them encrypted and does not show them again. They can be
 * copied, or downloaded as a text file that says what they are for; they stay on the screen until the
 * user says they are saved. The copy's outcome has its line reserved, so nothing moves.
 */
export function BackupCodes(props: BackupCodesProps) {
  const { t } = useI18n()
  const [copied, setCopied] = createSignal<'copied' | 'copyFailed'>()
  const text = () => props.codes.join('\n')
  const file = () => `${t('account.backupCodes.file', { email: props.email, app: t('app.name') })}\n\n${text()}\n`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text())
      setCopied('copied')
    } catch {
      setCopied('copyFailed')
    }
  }

  return (
    <div class="flex flex-col gap-4">
      <p tabIndex={-1} ref={(message) => onMount(() => message.focus())} class="font-medium outline-none">
        {props.message}
      </p>
      <p class="text-muted-foreground">{t('account.backupCodes.save')}</p>
      <ul
        aria-label={t('account.backupCodes.label')}
        class="grid grid-cols-2 gap-2 rounded-md bg-secondary p-4 font-mono text-secondary-foreground"
      >
        <For each={props.codes}>{(code) => <li>{code}</li>}</For>
      </ul>
      <div class="flex gap-2">
        <Button class="flex-1 sm:flex-none" onClick={copy}>
          {t('account.backupCodes.copy')}
        </Button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(file())}`}
          download="backup-codes.txt"
          class={cn(buttonVariants(), 'flex-1 sm:flex-none')}
        >
          {t('account.backupCodes.download')}
        </a>
      </div>
      <p role="status" class="min-h-5 text-sm">
        <Show when={copied()}>{(result) => t(`account.backupCodes.${result()}`)}</Show>
      </p>
      <Button variant="primary" class="w-full sm:w-auto sm:self-start" onClick={() => props.onSaved()}>
        {t('account.backupCodes.saved')}
      </Button>
    </div>
  )
}
