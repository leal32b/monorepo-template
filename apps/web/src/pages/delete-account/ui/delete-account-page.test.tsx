import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider, ThemeProvider } from '#shared/config'
import { DeleteAccountPage } from './delete-account-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const plan = { organizations: [{ id: 'org-1', name: 'Shared', slug: 'shared', outcome: 'left' }] }

function renderPage(
  path: string,
  auth: Fetch = async () => Response.json({ success: true, message: 'User deleted' }),
  api: () => Promise<Response> = async () => Response.json(plan)
) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: api })}>
            <AuthProvider client={createAuthClient({ fetch: auth })}>
              <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                <MemoryRouter history={history}>
                  <Route path="/settings/delete-account" component={DeleteAccountPage} />
                  <Route path="*" component={() => <p>Elsewhere</p>} />
                </MemoryRouter>
              </SessionProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
  return history
}

describe('DeleteAccountPage', () => {
  it('says whose account it is and what goes, and deletes nothing on opening', async () => {
    const auth = vi.fn<Fetch>()
    renderPage('/settings/delete-account?token=tok-1', auth)

    expect(await screen.findByText('You leave these organizations: Shared.', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(auth).not.toHaveBeenCalled()
  })

  it('deletes the account with its button and leaves for the sign-in, which says so', async () => {
    const history = renderPage('/settings/delete-account?token=tok-1')

    fireEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))

    await waitFor(() => expect(history.get()).toBe('/login?deleted=1'))
  })

  it('goes back to the profile on Cancel', async () => {
    const history = renderPage('/settings/delete-account?token=tok-1')

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(history.get()).toBe('/settings/profile'))
  })

  it('says a link without its token cannot be used, with the way to a new one', () => {
    renderPage('/settings/delete-account')

    expect(screen.getByRole('alert')).toHaveTextContent('This link has expired or was already used.')
    expect(screen.getByRole('link', { name: 'Go to your profile' })).toHaveAttribute('href', '/settings/profile')
  })

  it('holds the place of the confirmation while it reads what goes', async () => {
    renderPage('/settings/delete-account?token=tok-1', undefined, () => new Promise<Response>(() => {}))

    expect(
      await screen.findByText('Checking what deleting your account would do', { selector: '[role="status"]' })
    ).toBeInTheDocument()
  })

  it('says it could not read what goes', async () => {
    renderPage('/settings/delete-account?token=tok-1', undefined, async () =>
      Response.json({ code: 'internal_error' }, { status: 500 })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not check what deleting your account would do.'
    )
  })
})
