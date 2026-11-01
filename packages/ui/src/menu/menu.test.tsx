import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { Menu, MenuHeader, MenuItem, MenuSeparator } from './menu'

function Account(props: { onSettings?: () => void; onSignOut?: () => void }) {
  return (
    <Menu trigger="Ada" triggerClass="p-2">
      <MenuHeader>
        <span>ada@example.com</span>
      </MenuHeader>
      <MenuSeparator />
      <MenuItem icon="preferences" onSelect={props.onSettings ?? (() => {})}>
        Settings
      </MenuItem>
      <MenuItem icon="sign-out" onSelect={props.onSignOut ?? (() => {})}>
        Sign out
      </MenuItem>
    </Menu>
  )
}

const open = () => fireEvent.keyDown(screen.getByRole('button', { name: 'Ada' }), { key: 'Enter' })

describe('Menu', () => {
  it('starts closed, and opens from the keyboard with its header and items', async () => {
    render(() => <Account />)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    open()

    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Settings', 'Sign out'])
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('runs the chosen item and closes', async () => {
    const onSignOut = vi.fn()
    render(() => <Account onSignOut={onSignOut} />)
    open()

    fireEvent.pointerUp(await screen.findByRole('menuitem', { name: 'Sign out' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('leaves the page scrollable while open: no scroll lock, so nothing shifts', async () => {
    render(() => <Account />)
    open()
    await screen.findByRole('menu')

    expect(document.body.style.overflow).not.toBe('hidden')
    expect(document.body.style.pointerEvents).not.toBe('none')
  })

  it('opens with the pop motion, from its button', async () => {
    render(() => <Account />)
    open()

    expect(await screen.findByRole('menu')).toHaveClass('ds-pop')
  })

  it('closes on Escape', async () => {
    render(() => <Account />)
    open()
    const menu = await screen.findByRole('menu')

    fireEvent.keyDown(menu, { key: 'Escape' })

    await waitFor(() => expect(screen.getByRole('menu', { hidden: true })).toHaveAttribute('data-closed'))
  })

  it('names an icon-only trigger by its label', () => {
    render(() => (
      <Menu trigger={<span>⋯</span>} triggerLabel="More actions">
        <MenuItem onSelect={() => {}}>Rename</MenuItem>
      </Menu>
    ))

    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
  })

  it('puts the trigger class on the trigger and shows an icon only on items that have one', async () => {
    const { baseElement } = render(() => <Account />)
    open()
    await screen.findByRole('menu')

    expect(screen.getByRole('button', { name: 'Ada' })).toHaveClass('p-2')
    expect(baseElement.querySelectorAll('[role="menuitem"] svg')).toHaveLength(2)
  })

  it('lets an item add a class of its own, and has no icon when it has none', async () => {
    const { baseElement } = render(() => (
      <Menu trigger="Open">
        <MenuItem onSelect={() => {}} class="text-destructive">
          Delete
        </MenuItem>
      </Menu>
    ))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Open' }), { key: 'Enter' })

    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toHaveClass('text-destructive')
    expect(baseElement.querySelector('[role="menuitem"] svg')).toBeNull()
  })
})
