import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { LinkGoogle } from './link-google'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const google = 'https://accounts.google.com/o/oauth2/v2/auth?state=s'

function renderLink(error?: string, fetch = vi.fn<Fetch>(async () => Response.json({ url: google, redirect: false }))) {
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <LinkGoogle email="ada@example.com" error={error} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { fetch, button: screen.getByRole('button', { name: 'Link Google' }) }
}

describe('LinkGoogle', () => {
  afterEach(() => vi.restoreAllMocks())

  it('goes to Google to link the account, coming back to this page either way', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const { fetch, button } = renderLink()

    fireEvent.click(button)

    expect(button).toBeDisabled()
    await waitFor(() => expect(assign).toHaveBeenCalledWith(google))
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/link-social`)
    expect(JSON.parse(String(init?.body))).toEqual({
      provider: 'google',
      callbackURL: '/settings/security',
      errorCallbackURL: '/settings/security',
      disableRedirect: true
    })
  })

  it('says why Google was not linked, in words for what users can fix, taking focus so it is not missed', () => {
    renderLink('email_does_not_match')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'That Google account has another email. Link the one with ada@example.com.'
    )
    expect(screen.getByRole('alert')).toHaveFocus()
  })

  it('says anything else went wrong, with the code support needs', () => {
    renderLink('unable_to_link_account')

    expect(screen.getByRole('alert')).toHaveTextContent('Google could not be linked. Try again in a moment.')
    expect(screen.getByRole('alert')).toHaveTextContent('unable_to_link_account')
  })

  it('says when linking could not start, and lets the user try again', async () => {
    const { button } = renderLink(
      undefined,
      vi.fn<Fetch>(async () => Response.json({}, { status: 429 }))
    )

    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
    expect(button).toBeEnabled()
  })
})
