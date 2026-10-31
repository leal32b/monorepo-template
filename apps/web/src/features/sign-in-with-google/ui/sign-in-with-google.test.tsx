import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { SignInWithGoogle } from './sign-in-with-google'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth's answer to the start of the flow: the Google page to go to. */
const toGoogle = () => Response.json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?state=s', redirect: false })

/** The button for a sign-in headed to `/projects`; `options` answers `/api/identity/options`. */
function renderGoogle({
  options = async () => Response.json({ google: true }),
  fetch = vi.fn<Fetch>(async () => toGoogle()),
  error = undefined as string | undefined
} = {}) {
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: options })}>
        <AuthProvider client={createAuthClient({ fetch })}>
          <SignInWithGoogle next="/projects" error={error} />
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return { fetch, button: screen.getByRole('button', { name: 'Continue with Google' }) }
}

/** True once the button is shown, after the API said Google is on. */
const shown = (button: HTMLElement) => button.closest('.invisible') === null

describe('SignInWithGoogle', () => {
  afterEach(() => vi.restoreAllMocks())

  it('offers Google when the API says it is on, keeping its room while it asks, so nothing below moves', async () => {
    let answer!: (response: Response) => void
    const { button } = renderGoogle({ options: () => new Promise((resolve) => (answer = resolve)) })

    expect(shown(button)).toBe(false)
    answer(Response.json({ google: true }))

    await waitFor(() => expect(shown(button)).toBe(true))
  })

  it('leaves Google out when the API says it is off', async () => {
    renderGoogle({ options: async () => Response.json({ google: false }) })

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument())
  })

  it('goes to Google, asking to come back to where the user was headed', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const { fetch, button } = renderGoogle()
    await waitFor(() => expect(shown(button)).toBe(true))

    fireEvent.click(button)

    expect(button).toBeDisabled()
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?state=s'))
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      provider: 'google',
      callbackURL: '/projects',
      errorCallbackURL: '/login?next=%2Fprojects',
      disableRedirect: true
    })
  })

  it('says what went wrong when the way to Google cannot start, and lets the user try again', async () => {
    const { button } = renderGoogle({
      fetch: vi.fn<Fetch>(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))
    })
    await waitFor(() => expect(shown(button)).toBe(true))

    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    expect(button).toBeEnabled()
  })

  it('explains, in its own words, what Google sign-in came back with', async () => {
    renderGoogle({ error: 'access_denied' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Signing in with Google was cancelled. Try again, or sign in with your email.'
    )
  })

  it('says an error it has no words for went wrong, with its code for support', async () => {
    renderGoogle({ error: 'unable_to_create_user' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Signing in with Google did not work. Try again in a moment.')
    expect(alert).toHaveTextContent('If it keeps happening, tell support: unable_to_create_user')
  })
})
