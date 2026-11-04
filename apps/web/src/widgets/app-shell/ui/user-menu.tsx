import { Avatar, cn, Menu, MenuHeader, MenuItem, MenuSeparator, MenuTriggerContent, menuTriggerClass } from '@repo/ui'
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
      triggerClass={cn(menuTriggerClass, props.class)}
      trigger={<MenuTriggerContent avatar={<Avatar name={user.name} size="sm" />} label={user.name} />}
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
