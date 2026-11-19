import { legal } from '@repo/contracts'
import { For } from 'solid-js'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'

/**
 * A legal text's body (ADR 0074): the version in force, which every account made from now on records, and its
 * paragraphs. The text is the `legal` group of the dictionaries, a product's to write. The page around draws
 * it in the entry frame. A slice of its own, so the entry screens' first download does not carry it.
 */
export function LegalDocument(props: { document: 'terms' | 'privacy' }) {
  const { t, locale } = useI18n()
  const version = () => formatDate(new Date(`${legal.version}T00:00:00Z`), locale(), 'UTC')
  const paragraphs = () => t(`legal.${props.document}.body`).split(/\n{2,}/)

  return (
    <div class="flex flex-col gap-4">
      <p class="text-sm text-muted-foreground">{t('legal.version', { date: version() })}</p>
      <For each={paragraphs()}>{(paragraph) => <p>{paragraph}</p>}</For>
    </div>
  )
}
