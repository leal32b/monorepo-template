import { legal } from '@repo/contracts'
import { For } from 'solid-js'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * A legal text in the entry frame (ADR 0074), signed in or not: its title, the version in force, which every
 * account made from now on records, and its paragraphs. The text is the `legal` group of the dictionaries, a
 * product's to write. A slice of its own, so the entry screens' first download does not carry it.
 */
export function LegalDocument(props: { document: 'terms' | 'privacy' }) {
  const { t, locale } = useI18n()
  const version = () => formatDate(new Date(`${legal.version}T00:00:00Z`), locale(), 'UTC')
  const paragraphs = () => t(`legal.${props.document}.body`).split(/\n{2,}/)

  return (
    <EntryLayout title={t(`legal.${props.document}.title`)} description={t(`legal.${props.document}.description`)}>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">{t('legal.version', { date: version() })}</p>
        <For each={paragraphs()}>{(paragraph) => <p>{paragraph}</p>}</For>
      </div>
    </EntryLayout>
  )
}
