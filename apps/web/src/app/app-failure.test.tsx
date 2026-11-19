import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { AppFailure } from './app-failure'

function renderFailure(reference: string | undefined) {
  render(() => (
    <I18nProvider locale="en">
      <MemoryRouter>
        <Route path="/" component={() => <AppFailure reference={reference} />} />
      </MemoryRouter>
    </I18nProvider>
  ))
}

describe('AppFailure (ADR 0072)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('says the screen stopped, shows the reference to quote to support as every failure does, and reloads when asked', async () => {
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => undefined)
    renderFailure('a1b2c3d4e5f6')

    expect(await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('This screen stopped working.')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'If it keeps happening, tell support: client_error · a1b2c3d4e5f6'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reload the page' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('shows no reference when none was sent', async () => {
    renderFailure(undefined)

    expect(await screen.findByRole('alert')).not.toHaveTextContent('tell support')
  })
})
