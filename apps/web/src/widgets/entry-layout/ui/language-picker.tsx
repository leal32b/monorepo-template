import { Select } from '@repo/ui'
import { type Locale, localeNames, locales, useI18n } from '#shared/config'

/**
 * Lets someone who has not signed in yet read the screens in another language. The choice is kept on
 * this device, so the next screen, and the next visit, start in it.
 */
export function LanguagePicker() {
  const { t, locale, setLocale } = useI18n()

  return (
    <Select
      aria-label={t('entryLayout.language')}
      options={locales.map((value) => ({ value, label: localeNames[value] }))}
      value={locale()}
      onChange={(value) => setLocale(value as Locale)}
    />
  )
}
