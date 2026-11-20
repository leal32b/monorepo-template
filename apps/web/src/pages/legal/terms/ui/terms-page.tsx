import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'
import { LegalDocument } from '#widgets/legal-document'

/** `/terms`: the terms of use, in the entry frame, signed in or not (ADR 0074). */
export function TermsPage() {
  const { t } = useI18n()
  return (
    <EntryLayout title={t('legal.terms.title')} description={t('legal.terms.description')}>
      <LegalDocument document="terms" />
    </EntryLayout>
  )
}
