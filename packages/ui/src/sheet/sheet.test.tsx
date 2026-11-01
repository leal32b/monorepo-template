import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { Sheet } from './sheet'

function Drawer() {
  const [open, setOpen] = createSignal(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>
      <Sheet open={open()} onOpenChange={setOpen} title="Menu" closeLabel="Close menu">
        <nav>
          <a href="#home">Home</a>
        </nav>
      </Sheet>
    </>
  )
}

describe('Sheet', () => {
  it('dims the page with the scrim, which stays dark in both themes', async () => {
    render(() => <Drawer />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = await screen.findByRole('dialog')

    expect(document.querySelector('.fixed.inset-0')).toHaveClass('bg-scrim/60', 'ds-scrim')
    expect(dialog).toHaveClass('ds-sheet')
  })

  it('is hidden until opened, then a modal dialog named by its title holding the menu', async () => {
    render(() => <Drawer />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    const dialog = await screen.findByRole('dialog', { name: 'Menu' })
    expect(dialog).toContainElement(screen.getByRole('link', { name: 'Home' }))
  })

  it('closes with its labelled close button', async () => {
    render(() => <Drawer />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Close menu' }))

    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
  })

  it('closes on Escape', async () => {
    render(() => <Drawer />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
  })
})
