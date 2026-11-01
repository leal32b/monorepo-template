import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { type CommandItem, CommandPalette } from './command-palette'

const items: CommandItem[] = [
  { id: 'home', label: 'Home', group: 'Go to', icon: 'home' },
  { id: 'security', label: 'Security', group: 'Go to', icon: 'security', keywords: 'password two-step' },
  { id: 'session', label: 'Sesión', group: 'Go to' },
  { id: 'dark', label: 'Use the dark theme', group: 'Actions', icon: 'moon' },
  { id: 'sign-out', label: 'Sign out', group: 'Actions', icon: 'sign-out' }
]

function Palette(props: { onSelect?: (id: string) => void; initiallyOpen?: boolean }) {
  const [open, setOpen] = createSignal(props.initiallyOpen ?? true)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <CommandPalette
        open={open()}
        onOpenChange={setOpen}
        title="Command palette"
        placeholder="Search screens and actions…"
        emptyLabel="Nothing matches."
        items={items}
        onSelect={props.onSelect ?? (() => {})}
      />
    </>
  )
}

const search = () => screen.getByRole('combobox', { name: 'Command palette' })
const names = () => screen.getAllByRole('option').map((option) => option.textContent)
const type = (value: string) => fireEvent.input(search(), { target: { value } })
const press = (key: string) => fireEvent.keyDown(search(), { key })

describe('CommandPalette', () => {
  it('is a dialog named by its title, with the search field ready to type', async () => {
    render(() => <Palette />)

    expect(await screen.findByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
    expect(search()).toHaveAttribute('placeholder', 'Search screens and actions…')
    await waitFor(() => expect(search()).toHaveFocus())
  })

  it('dims the page behind it with the scrim, which stays dark in both themes', () => {
    render(() => <Palette />)

    expect(document.querySelector('.fixed.inset-0')).toHaveClass('bg-scrim/60', 'ds-scrim')
  })

  it('appears with the dialog motion, and stays centred without a transform the motion would undo', () => {
    render(() => <Palette />)
    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveClass('ds-dialog', 'inset-x-4', 'mx-auto')
    expect(dialog.className).not.toContain('translate')
  })

  it('is not there until opened', () => {
    render(() => <Palette initiallyOpen={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lists every item under its group heading, in order', () => {
    render(() => <Palette />)

    expect(names()).toEqual(['Home', 'Security', 'Sesión', 'Use the dark theme', 'Sign out'])
    expect(screen.getByRole('group', { name: 'Go to' })).toContainElement(screen.getByRole('option', { name: 'Home' }))
    expect(screen.getByRole('group', { name: 'Actions' })).toContainElement(
      screen.getByRole('option', { name: 'Sign out' })
    )
  })

  it('filters as you type, by label or keyword, without caring for case or accents', () => {
    render(() => <Palette />)

    type('SIGN')
    expect(names()).toEqual(['Sign out'])
    type('password')
    expect(names()).toEqual(['Security'])
    type('sesion')
    expect(names()).toEqual(['Sesión'])
    type('use dark')
    expect(names()).toEqual(['Use the dark theme'])
  })

  it('hides a group none of whose items match', () => {
    render(() => <Palette />)

    type('home')

    expect(screen.queryByRole('group', { name: 'Actions' })).not.toBeInTheDocument()
  })

  it('says when nothing matches', () => {
    render(() => <Palette />)

    type('zzz')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Nothing matches.')
  })

  it('highlights the first item, and the arrows walk the list and wrap around', () => {
    render(() => <Palette />)
    const highlighted = () => screen.getByRole('option', { selected: true }).textContent

    expect(highlighted()).toBe('Home')
    expect(search()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Home' }).id)
    press('ArrowDown')
    expect(highlighted()).toBe('Security')
    press('ArrowUp')
    press('ArrowUp')
    expect(highlighted()).toBe('Sign out')
    press('ArrowDown')
    expect(highlighted()).toBe('Home')
    press('End')
    expect(highlighted()).toBe('Sign out')
    press('Home')
    expect(highlighted()).toBe('Home')
  })

  it('goes back to the first match when the search changes', () => {
    render(() => <Palette />)
    press('ArrowDown')

    type('s')

    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Security')
  })

  it('chooses the highlighted item on Enter and closes', async () => {
    const onSelect = vi.fn()
    render(() => <Palette onSelect={onSelect} />)
    type('sign')

    press('Enter')

    expect(onSelect).toHaveBeenCalledWith('sign-out')
    expect(await screen.findByRole('dialog', { hidden: true })).toHaveAttribute('data-closed')
  })

  it('chooses an item on click, and highlights the one under the pointer', () => {
    const onSelect = vi.fn()
    render(() => <Palette onSelect={onSelect} />)

    fireEvent.pointerMove(screen.getByRole('option', { name: 'Security' }))
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Security')
    fireEvent.click(screen.getByRole('option', { name: 'Use the dark theme' }))

    expect(onSelect).toHaveBeenCalledWith('dark')
  })

  it('chooses nothing on Enter when nothing matches', () => {
    const onSelect = vi.fn()
    render(() => <Palette onSelect={onSelect} />)
    type('zzz')

    press('Enter')

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ignores other keys', () => {
    const onSelect = vi.fn()
    render(() => <Palette onSelect={onSelect} />)

    press('a')

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Home')
  })

  it('closes on Escape', async () => {
    render(() => <Palette />)

    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' })

    expect(await screen.findByRole('dialog', { hidden: true })).toHaveAttribute('data-closed')
  })

  it('shows an icon only on the items that have one, hidden from screen readers', () => {
    render(() => <Palette />)

    expect(screen.getByRole('option', { name: 'Home' }).querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('option', { name: 'Sesión' }).querySelector('svg')).toBeNull()
  })
})
