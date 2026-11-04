import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/onboarding`: where a signed-in user without an organization lands (ADR 0033, D4). Step 8 of the
 * organizations plan puts the pending invitations and the one-field form here.
 */
export function OnboardingPage() {
  const { t } = useI18n()

  return <EntryLayout title={t('onboarding.title')} description={t('onboarding.description')} />
}
