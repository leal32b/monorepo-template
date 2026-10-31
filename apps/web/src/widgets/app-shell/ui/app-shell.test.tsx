import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { AppShell } from './app-shell'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** An app page at `/projects` in the shell, with Better Auth answering through `fetch`. */
function renderShell(fetch: Fetch = async () => Response.json({ success: true })) {
  const history = createMemoryHistory()
  history.set({ value: '/projects' })
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
          <MemoryRouter history={history}>
            <Route
              path="/projects"
              component={() => (
                <AppShell title="Projects">
                  <p>The projects</p>
                </AppShell>
              )}
            />
            <Route path="/login" component={() => <p>The sign-in</p>} />
          </MemoryRouter>
        </SessionProvider>
      </AuthProvider>
    </I18nProvider>
  ))
  return history
}

describe('AppShell', () => {
  it('frames an app page: the brand and who is signed in above, the title and the content below', () => {
    renderShell()

    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: 'Monorepo Template' })).toHaveAttribute('href', '/')
    expect(within(header).getByRole('link', { name: 'Signed in as Ada Lovelace' })).toHaveAttribute('href', '/account')
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1, name: 'Projects' })).toHaveFocus()
    expect(within(main).getByText('The projects')).toBeInTheDocument()
  })

  it('signs out from the header, then leaves for the sign-in', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ success: true }))
    const history = renderShell(fetch)

    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(history.get()).toBe('/login'))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/sign-out`)
  })

  it('says when signing out failed, and stays', async () => {
    const history = renderShell(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    expect(history.get()).toBe('/projects')
  })
})
