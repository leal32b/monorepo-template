import { type CommandItem, CommandPalette, type IconName } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { homeOf } from '#entities/organizations'
import { type Theme, themes, useI18n, usePalette, useTheme } from '#shared/config'
import { screensOf } from '../model/product-screens'
import { accountSettings, organizationSettings } from '../model/settings-items'
import { useFrameOrganization } from '../model/shell'

const themeIcons: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }

/**
 * The command palette of the shell: the screens to go to and a few actions to run (the theme, signing
 * out). The keys that open it live in the app; here is what it holds and what each item does. Its screens
 * are the side menu's: the product's, the person's settings and the organization's.
 */
export function ShellPalette(props: { signOut: () => void }) {
  const { t } = useI18n()
  const palette = usePalette()
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const current = useFrameOrganization()

  const go = t('appShell.palette.go')
  const actions = t('appShell.palette.actions')

  const items = (organization = current()): CommandItem[] => [
    ...screensOf(organization).map((screen) => ({
      id: `go:${screen.href}`,
      label: t(`appShell.nav.${screen.label}`),
      group: go,
      icon: screen.icon,
      keywords: t(`appShell.palette.keywords.${screen.label}`)
    })),
    ...accountSettings.map((item) => ({
      id: `go:${item.href}`,
      label: t(`appShell.nav.${item.label}`),
      group: go,
      icon: item.icon,
      keywords: t(`appShell.palette.keywords.${item.label}`)
    })),
    // The organization's own settings, when the screen is one of its: the same as the side menu offers.
    ...(organization
      ? organizationSettings(homeOf(organization)).map((item) => ({
          id: `go:${item.href}`,
          label: t(`appShell.nav.${item.label}`),
          group: go,
          icon: item.icon,
          keywords: t(`appShell.palette.keywords.${item.label}`)
        }))
      : []),
    {
      id: 'go:/onboarding',
      label: t('appShell.organizations.create'),
      group: actions,
      icon: 'plus',
      keywords: t('appShell.palette.keywords.create')
    },
    ...themes.map((theme) => ({
      id: `theme:${theme}`,
      label: t(`appShell.palette.theme.${theme}`),
      group: actions,
      icon: themeIcons[theme],
      keywords: t('appShell.palette.keywords.theme')
    })),
    {
      id: 'sign-out',
      label: t('appShell.account.signOut'),
      group: actions,
      icon: 'sign-out',
      keywords: t('appShell.palette.keywords.signOut')
    }
  ]

  const run = (id: string) => {
    if (id === 'sign-out') props.signOut()
    else if (id.startsWith('theme:')) setTheme(id.slice('theme:'.length) as Theme)
    else navigate(id.slice('go:'.length))
  }

  return (
    <CommandPalette
      open={palette.open()}
      onOpenChange={palette.setOpen}
      title={t('appShell.palette.title')}
      placeholder={t('appShell.palette.placeholder')}
      emptyLabel={t('appShell.palette.empty')}
      items={items()}
      onSelect={run}
    />
  )
}
