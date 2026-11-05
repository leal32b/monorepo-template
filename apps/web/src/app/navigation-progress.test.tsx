import { A, createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createResource, Suspense } from 'solid-js'
import { createRequests } from '#shared/api'
import { NavigationProgress } from './navigation-progress'

describe('NavigationProgress', () => {
  it('shows the bar while a navigation waits on something that is not a request, such as a screen’s code', async () => {
    let arrive: (text: string) => void = () => undefined
    const code = new Promise<string>((resolve) => {
      arrive = resolve
    })
    function Slow() {
      const [text] = createResource(() => code)
      return <p>{text()}</p>
    }
    render(() => (
      <MemoryRouter
        history={createMemoryHistory()}
        root={(root) => (
          <>
            <NavigationProgress requests={createRequests()} />
            <Suspense>{root.children}</Suspense>
          </>
        )}
      >
        <Route path="/" component={() => <A href="/slow">To the slow screen</A>} />
        <Route path="/slow" component={Slow} />
      </MemoryRouter>
    ))

    fireEvent.click(await screen.findByRole('link', { name: 'To the slow screen' }))

    expect(await screen.findByTestId('progress-bar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'To the slow screen' })).toBeInTheDocument()
    arrive('The slow screen')
    expect(await screen.findByText('The slow screen')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument())
  })
})
