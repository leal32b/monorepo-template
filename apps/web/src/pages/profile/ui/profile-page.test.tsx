import type { AccountDeletion } from '@repo/contracts'
import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider, ThemeProvider } from '#shared/config'
import { ProfilePage } from './profile-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const organization = (name: string, outcome: AccountDeletion['organizations'][number]['outcome']) => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  outcome
})

/** The profile, its reads answered by `plans` in turn (the last one again) and Better Auth by `auth`. */
function renderPage(plans: Array<AccountDeletion | Response | 'never'>, auth: Fetch = async () => Response.json(null)) {
  let read = 0
  const api = vi.fn(async () => {
    const answer = plans[Math.min(read++, plans.length - 1)] as AccountDeletion | Response | 'never'
    if (answer === 'never') return new Promise<Response>(() => {})
    return answer instanceof Response ? answer : Response.json(answer)
  })
  render(() => (
    <I18nProvider locale="en">
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: api })}>
            <AuthProvider client={createAuthClient({ fetch: auth })}>
              <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                <MemoryRouter>
                  <Route path="/" component={ProfilePage} />
                </MemoryRouter>
              </SessionProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
  return { api }
}

const deletion = async () => within(await screen.findByRole('region', { name: 'Delete account' }))

describe('ProfilePage', () => {
  it('shows the name and the email of who is signed in', () => {
    renderPage([{ organizations: [] }])

    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    const details = within(screen.getByRole('region', { name: 'Your details' }))
    expect(details.getByText('Name').parentElement?.parentElement).toHaveTextContent('Ada Lovelace')
    expect(details.getByText('Email').parentElement?.parentElement).toHaveTextContent('ada@example.com')
  })

  it('opens the deletion, which says what goes, and says where the link went once it is sent', async () => {
    const auth = vi.fn<Fetch>(async () => Response.json({ success: true, message: 'Verification email sent' }))
    renderPage([{ organizations: [organization('Alone', 'deleted')] }], auth)
    const section = await deletion()

    fireEvent.click(section.getByRole('button', { name: 'Delete account' }))
    expect(section.getByText(/go too, with everything in them: Alone\./)).toBeInTheDocument()
    fireEvent.click(section.getByRole('button', { name: 'Email me the link' }))

    expect(
      await section.findByText(
        'We sent a link to ada@example.com. Open it within 1 hour, where you are signed in, to delete your account.'
      )
    ).toBeInTheDocument()
    expect(section.queryByRole('button', { name: 'Email me the link' })).not.toBeInTheDocument()
  })

  it('names each organization that blocks it, with the way out, and offers no deletion', async () => {
    renderPage([{ organizations: [organization('Shared', 'blocked'), organization('Theirs', 'left')] }])
    const section = await deletion()

    expect(section.getByText('You are the only owner of Shared')).toBeInTheDocument()
    expect(section.getByRole('link', { name: 'Open members' })).toHaveAttribute('href', '/shared/settings/members')
    expect(section.queryByText('You are the only owner of Theirs')).not.toBeInTheDocument()
    expect(section.queryByRole('button', { name: 'Delete account' })).not.toBeInTheDocument()
  })

  it('reads the outcome again when an organization came to block it meanwhile', async () => {
    const auth = async () => Response.json({ code: 'SOLE_OWNER_OF_SHARED_ORGANIZATION' }, { status: 403 })
    const { api } = renderPage([{ organizations: [] }, { organizations: [organization('Shared', 'blocked')] }], auth)
    const section = await deletion()

    fireEvent.click(section.getByRole('button', { name: 'Delete account' }))
    fireEvent.click(section.getByRole('button', { name: 'Email me the link' }))

    expect(await section.findByText('You are the only owner of Shared')).toBeInTheDocument()
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('can be cancelled', async () => {
    renderPage([{ organizations: [] }])
    const section = await deletion()

    fireEvent.click(section.getByRole('button', { name: 'Delete account' }))
    fireEvent.click(section.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(section.queryByRole('button', { name: 'Email me the link' })).not.toBeInTheDocument())
  })

  it('holds the place of the deletion while it is read the first time', async () => {
    renderPage(['never'])

    expect(
      await screen.findByText('Checking what deleting your account would do', { selector: '[role="status"]' })
    ).toBeInTheDocument()
  })

  it('says it could not read what deleting would do, and keeps the details', async () => {
    renderPage([Response.json({ code: 'internal_error' }, { status: 500 })])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not check what deleting your account would do.'
    )
    expect(screen.getByRole('region', { name: 'Your details' })).toBeInTheDocument()
  })
})
