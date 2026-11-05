import { render, screen } from '@solidjs/testing-library'
import { Avatar } from '#avatar'
import { Menu, MenuItem } from './menu'
import { MenuTriggerContent, menuTriggerClass } from './menu-trigger'

describe('MenuTriggerContent', () => {
  it('shows the avatar, the name and the mark of a menu, in a trigger as tall as a touch target', () => {
    render(() => (
      <Menu
        triggerClass={menuTriggerClass}
        trigger={<MenuTriggerContent avatar={<Avatar name="Acme" shape="square" size="sm" />} label="Acme Labs" />}
      >
        <MenuItem onSelect={() => {}}>Create</MenuItem>
      </Menu>
    ))
    const trigger = screen.getByRole('button', { name: /Acme Labs/ })

    expect(trigger).toHaveClass('h-11', 'w-full')
    expect(screen.getByText('Acme Labs')).toHaveClass('truncate')
    expect(trigger.querySelectorAll('svg')).toHaveLength(1)
  })
})
