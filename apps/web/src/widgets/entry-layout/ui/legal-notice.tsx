import { Link } from '@repo/ui'
import { useI18n } from '#shared/config'

/**
 * "By continuing, you accept the Terms of use and the Privacy notice" (ADR 0074), below every button that
 * makes an account: the sign-up's, and Google's on the sign-in. Each link opens in a new tab, so the form
 * keeps what was typed. The account records the version in force; no box to tick.
 */
export function LegalNotice() {
  const { t } = useI18n()
  const link = (href: string, text: string) => (
    <Link href={href} target="_blank" rel="noopener">
      {text}
      <span class="sr-only">{t('mail.newTab')}</span>
    </Link>
  )

  return (
    <p class="text-sm text-muted-foreground">
      {t('legalNotice.before')} {link('/terms', t('entryLayout.terms'))} {t('legalNotice.and')}{' '}
      {link('/privacy', t('entryLayout.privacy'))}
      {t('legalNotice.after')}
    </p>
  )
}
