import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { ApiError } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ReadFailure } from './read-failure'

/** A part of a screen whose read fails with `failure` the first `times` times, then reads. */
function renderPart(failure: unknown, fallback?: (error: unknown, retry: () => void) => ReturnType<typeof Part>) {
  const [tries, setTries] = createSignal(0)
  function Part() {
    setTries((count) => count + 1)
    if (tries() === 1) throw failure
    return <p>The part</p>
  }
  const history = createMemoryHistory()
  history.set({ value: '/settings/security?from=menu' })
  render(() => (
    <I18nProvider locale="en">
      <MemoryRouter history={history}>
        <Route
          path="/settings/security"
          component={() => (
            <ReadFailure message="We could not load this." fallback={fallback}>
              <Part />
            </ReadFailure>
          )}
        />
        <Route path="/login" component={() => <p>The sign-in</p>} />
      </MemoryRouter>
    </I18nProvider>
  ))
  return history
}

describe('ReadFailure (ADR 0038)', () => {
  it('says what could not be read, and reads again when asked', async () => {
    renderPart(new ApiError('network', 'The API could not be reached.'))

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load this.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('The part')).toBeInTheDocument()
  })

  it('sends the user to sign in when the read found the session ended, to come back here', async () => {
    const history = renderPart(new ApiError('http', 'Better Auth answered 401.', { status: 401 }))

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Fsettings%2Fsecurity%3Ffrom%3Dmenu'))
  })

  it('lets a screen say a failure its own way', async () => {
    renderPart(new ApiError('http', 'The API answered 404.', { status: 404 }), (error, retry) => (
      <button type="button" onClick={retry}>
        Not there ({(error as ApiError).status})
      </button>
    ))

    fireEvent.click(await screen.findByRole('button', { name: 'Not there (404)' }))

    expect(await screen.findByText('The part')).toBeInTheDocument()
  })
})
