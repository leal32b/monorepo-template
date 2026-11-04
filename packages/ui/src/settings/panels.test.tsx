import { fireEvent, render, screen } from '@solidjs/testing-library'
import { Button } from '#button'
import { PanelButton } from './panel-button'
import { createPanels } from './panels'
import { SettingsPanel } from './settings-panel'
import { SettingsRow } from './settings-row'

/** Two rows, each with a panel, on one screen. */
function Screen() {
  const panels = createPanels<'name' | 'address'>()
  return (
    <>
      {(['name', 'address'] as const).map((panel) => (
        <SettingsRow
          title={panel}
          action={
            <PanelButton panels={panels} panel={panel}>
              {`Change ${panel}`}
            </PanelButton>
          }
          panel={
            panels.isOpen(panel) && (
              <SettingsPanel label={`Change ${panel}`}>
                <Button onClick={panels.close}>Cancel</Button>
                <Button onClick={panels.dismiss}>Gone</Button>
              </SettingsPanel>
            )
          }
        />
      ))}
    </>
  )
}

describe('createPanels and PanelButton', () => {
  it('opens one panel at a time: its button leaves, the others wait', () => {
    render(() => <Screen />)

    fireEvent.click(screen.getByRole('button', { name: 'Change name' }))

    expect(screen.queryByRole('button', { name: 'Change name' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change address' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Change name' })).toHaveFocus()
  })

  it('gives focus back to the button that opened the panel when it closes', async () => {
    render(() => <Screen />)
    fireEvent.click(screen.getByRole('button', { name: 'Change name' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await Promise.resolve()

    expect(screen.getByRole('button', { name: 'Change name' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Change address' })).toBeEnabled()
  })

  it('closes without moving focus when the row is gone, for the screen to say so', async () => {
    render(() => <Screen />)
    fireEvent.click(screen.getByRole('button', { name: 'Change name' }))

    fireEvent.click(screen.getByRole('button', { name: 'Gone' }))
    await Promise.resolve()

    expect(screen.getByRole('button', { name: 'Change name' })).not.toHaveFocus()
  })

  it('stays disabled for a reason of its own, and says nothing before it opens', () => {
    const onOpen = vi.fn()
    const panels = createPanels()
    render(() => (
      <>
        <PanelButton panels={panels} panel="a" disabled>
          Locked
        </PanelButton>
        <PanelButton panels={panels} panel="b" variant="outline" onOpen={onOpen}>
          Open
        </PanelButton>
      </>
    ))

    expect(screen.getByRole('button', { name: 'Locked' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveClass('border-border')
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(onOpen).toHaveBeenCalled()
    expect(panels.open()).toBe('b')
  })

  it('gives no focus back when the opener of the closed panel never drew', async () => {
    const panels = createPanels()
    render(() => <Button>Elsewhere</Button>)
    panels.show('a')

    panels.close()
    await Promise.resolve()

    expect(panels.open()).toBeUndefined()
  })
})
