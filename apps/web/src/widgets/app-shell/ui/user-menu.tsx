import { cn, Icon, Menu, MenuHeader, MenuItem, MenuSeparator } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { useSession } from '#entities/sessions'
import { useI18n } from '#shared/config'
import { keepDrawerOpenOnNextScreen } from '../model/drawer-handoff'

/**
 * The account at the foot of the side menu: who is signed in, and what the account offers —
 * settings and signing out. The name is the trigger, so the menu is named by who it is for. In the
 * phone drawer, going to the settings keeps the drawer open, to pick another screen than the first.
 */
export function UserMenu(props: { signOut: () => void; inDrawer?: boolean | undefined; class?: string | undefined }) {
  const { t } = useI18n()
  const user = useSession()
  const navigate = useNavigate()

  return (
    <Menu
      placement="top-start"
      triggerClass={cn(
        'flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-secondary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        props.class
      )}
      trigger={
        <>
          <span
            aria-hidden="true"
            class="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-background text-sm font-semibold"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span class="min-w-0 flex-1 truncate text-base font-medium sm:text-sm">{user.name}</span>
          <Icon name="expand" class="text-muted-foreground" />
        </>
      }
    >
      <MenuHeader>
        <span class="truncate font-medium">{user.name}</span>
        <span class="truncate text-muted-foreground">{user.email}</span>
      </MenuHeader>
      <MenuSeparator />
      <MenuItem
        icon="preferences"
        onSelect={() => {
          if (props.inDrawer) keepDrawerOpenOnNextScreen()
          navigate('/settings/profile')
        }}
      >
        {t('appShell.account.settings')}
      </MenuItem>
      <MenuItem icon="sign-out" onSelect={props.signOut}>
        {t('appShell.account.signOut')}
      </MenuItem>
    </Menu>
  )
}
