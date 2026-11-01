import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { Popover } from './popover'

const trigger = () => screen.getByRole('button', { name: 'Status' })

function Status() {
  return (
    <Popover trigger="Status" triggerClass="p-2" title="Service status" closeLabel="Close">
      <p>All systems normal.</p>
    </Popover>
  )
}

describe('Popover', () => {
  it('starts closed and opens on click as a dialog named by its title', async () => {
    render(() => <Status />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger())

    const dialog = await screen.findByRole('dialog', { name: 'Service status' })
    expect(dialog).toHaveTextContent('All systems normal.')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes with its close button', async () => {
    render(() => <Status />)
    fireEvent.click(trigger())

    fireEvent.click(await screen.findByRole('button', { name: 'Close' }))

    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
  })

  it('closes on Escape', async () => {
    render(() => <Status />)
    fireEvent.click(trigger())
    const dialog = await screen.findByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
  })

  it('is as wide as a Menu, so both open inside a side menu', async () => {
    render(() => <Status />)
    fireEvent.click(trigger())

    expect(await screen.findByRole('dialog')).toHaveClass('w-56')
  })

  it('puts the trigger class on the trigger, and names an icon-only trigger by its label', () => {
    render(() => (
      <Popover
        trigger={<span>●</span>}
        triggerLabel="Service status"
        triggerClass="p-2"
        title="Service"
        closeLabel="Close"
      >
        Fine.
      </Popover>
    ))

    expect(screen.getByRole('button', { name: 'Service status' })).toHaveClass('p-2')
  })
})
