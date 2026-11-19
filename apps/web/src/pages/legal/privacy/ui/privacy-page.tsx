import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'
import { LegalDocument } from '#widgets/legal-document'

/** `/privacy`: the privacy notice, in the entry frame, signed in or not (ADR 0074). */
export function PrivacyPage() {
  const { t } = useI18n()
  return (
    <EntryLayout title={t('legal.privacy.title')} description={t('legal.privacy.description')}>
      <LegalDocument document="privacy" />
    </EntryLayout>
  )
}
