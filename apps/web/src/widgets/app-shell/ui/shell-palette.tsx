import { type CommandItem, CommandPalette, type IconName } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { type Theme, themes, useI18n, usePalette, useTheme } from '#shared/config'

const themeIcons: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }

/**
 * The command palette of the shell: the screens to go to and a few actions to run (the theme, signing
 * out). The keys that open it live in the app; here is what it holds and what each item does.
 */
export function ShellPalette(props: { signOut: () => void }) {
  const { t } = useI18n()
  const palette = usePalette()
  const navigate = useNavigate()
  const { setTheme } = useTheme()

  const go = t('appShell.palette.go')
  const actions = t('appShell.palette.actions')

  const items = (): CommandItem[] => [
    { id: 'go:/', label: t('appShell.nav.home'), group: go, icon: 'home' },
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
      icon: 'preferences',
      keywords: t('appShell.palette.keywords.preferences')
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
