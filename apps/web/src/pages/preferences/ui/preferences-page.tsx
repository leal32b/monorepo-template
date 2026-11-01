import { type IconName, SegmentedControl, Select, SettingsRow, SettingsSection } from '@repo/ui'
import { type Locale, localeNames, locales, type Theme, themes, useI18n, useTheme } from '#shared/config'
import { AppShell } from '#widgets/app-shell'

const themeIcons: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }

/**
 * `/settings/preferences`: the theme, three choices in view, and the language of the screens, in a
 * select since the list grows with each language added; both applied at once and kept in
 * this browser (ADR 0028). Emails keep the language given at sign-up, and the row says so.
 */
export function PreferencesPage() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <AppShell title={t('preferences.title')}>
      <SettingsSection title={t('preferences.appearance.title')} description={t('preferences.appearance.description')}>
        <SettingsRow
          icon="monitor"
          title={t('preferences.theme.title')}
          description={t('preferences.theme.description')}
          action={
            <SegmentedControl
              label={t('preferences.theme.title')}
              options={themes.map((value) => ({
                value,
                label: t(`preferences.theme.${value}`),
                icon: themeIcons[value]
              }))}
              value={theme()}
              onChange={(value) => setTheme(value as Theme)}
            />
          }
        />
      </SettingsSection>
      <SettingsSection title={t('preferences.language.title')} description={t('preferences.language.description')}>
        <SettingsRow
          letter="A"
          title={t('preferences.language.screens')}
          description={t('preferences.language.emails')}
          action={
            <Select
              aria-label={t('preferences.language.screens')}
              options={locales.map((value) => ({ value, label: localeNames[value] }))}
              value={locale()}
              onChange={(value) => setLocale(value as Locale)}
            />
          }
        />
      </SettingsSection>
    </AppShell>
  )
}
