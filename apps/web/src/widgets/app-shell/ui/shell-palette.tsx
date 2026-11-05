import { type CommandItem, CommandPalette, type IconName } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { homeOf } from '#entities/organizations'
import { type Theme, themes, useI18n, usePalette, useTheme } from '#shared/config'
import { useShellOrganization } from '../model/shell'

const themeIcons: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }

/**
 * The command palette of the shell: the screens to go to and a few actions to run (the theme, signing
 * out). The keys that open it live in the app; here is what it holds and what each item does.
 */
/** The icons of the organization's screens, as the side menu draws them. */
const organizationIcons = { general: 'organization', members: 'users', roles: 'role' } as const

export function ShellPalette(props: { signOut: () => void }) {
  const { t } = useI18n()
  const palette = usePalette()
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const current = useShellOrganization()

  const go = t('appShell.palette.go')
  const actions = t('appShell.palette.actions')

  const items = (organization = current()): CommandItem[] => [
    { id: `go:${homeOf(organization)}`, label: t('appShell.nav.home'), group: go, icon: 'home' },
    {
      id: 'go:/settings/profile',
      label: t('appShell.nav.profile'),
      group: go,
      icon: 'profile',
      keywords: t('appShell.palette.keywords.profile')
    },
    {
      id: 'go:/settings/security',
      label: t('appShell.nav.security'),
      group: go,
      icon: 'security',
      keywords: t('appShell.palette.keywords.security')
    },
    {
      id: 'go:/settings/preferences',
      label: t('appShell.nav.preferences'),
      group: go,
      icon: 'monitor',
      keywords: t('appShell.palette.keywords.preferences')
    },
    // The organization's own screens, when the screen is one of its: the same as the side menu offers.
    ...(organization
      ? (['general', 'members', 'roles'] as const).map((screen) => ({
          id: `go:${homeOf(organization)}/settings/${screen}`,
          label: t(`appShell.nav.${screen}`),
          group: go,
          icon: organizationIcons[screen],
          keywords: t(`appShell.palette.keywords.${screen}`)
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
