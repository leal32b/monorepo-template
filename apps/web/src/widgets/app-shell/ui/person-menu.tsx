import { Avatar, Menu, MenuHeader, MenuItem, MenuSeparator, MenuTriggerContent, menuTriggerClass } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { For } from 'solid-js'
import { useSession } from '#entities/sessions'
import { useI18n } from '#shared/config'
import { accountSettings } from '../model/settings-items'

/**
 * The person's menu, at the foot of the side menu (ADR 0080): what belongs to the person opens from their
 * name and round avatar. Who is signed in, their three settings, and signing out.
 */
export function PersonMenu(props: { signOut: () => void }) {
  const { t } = useI18n()
  const user = useSession()
  const navigate = useNavigate()

  return (
    <Menu
      placement="top-start"
      triggerClass={menuTriggerClass}
      trigger={<MenuTriggerContent avatar={<Avatar name={user.name} size="sm" />} label={user.name} />}
    >
      <MenuHeader>
        <span class="max-w-64 truncate font-medium">{user.name}</span>
        <span class="max-w-64 truncate text-muted-foreground">{user.email}</span>
      </MenuHeader>
      <MenuSeparator />
      <For each={accountSettings}>
        {(item) => (
          <MenuItem icon={item.icon} onSelect={() => navigate(item.href)}>
            {t(`appShell.nav.${item.label}`)}
          </MenuItem>
        )}
      </For>
      <MenuSeparator />
      <MenuItem icon="sign-out" onSelect={props.signOut}>
        {t('appShell.account.signOut')}
      </MenuItem>
    </Menu>
  )
}
