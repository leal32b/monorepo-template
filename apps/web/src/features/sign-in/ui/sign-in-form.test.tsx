import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { SignInForm } from './sign-in-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth's answer to a sign-in without a second factor. */
const signedIn = () => Response.json({ redirect: false, token: 'session', user: { id: 'u1' } })

function renderForm(fetch = vi.fn<Fetch>(async () => signedIn()), notice?: string) {
  const onSignedIn = vi.fn()
  const onSecondStep = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <SignInForm
          onSignedIn={onSignedIn}
          onSecondStep={onSecondStep}
          notice={notice && <p role="note">{notice}</p>}
          resend={(email) => <button type="button">{`Send it again to ${email}`}</button>}
          forgotPassword={(email) => (
            <a href="/forgot-password" data-email={email()}>
              Forgot your password?
            </a>
          )}
        />
      </AuthProvider>
    </I18nProvider>
  ))
  return { fetch, onSignedIn, onSecondStep }
}

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

/** True when `later` comes after `earlier` in the document, as it is read and laid out. */
const follows = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING)

/** Fills the form with a sign-in that passes every check, and sends it. */
function signIn() {
  type(screen.getByRole('textbox', { name: 'Email' }), 'Ada@Example.com')
  type(screen.getByLabelText('Password'), 'correct horse battery staple')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInForm', () => {
  it("offers a new password beside the password's label, with the email typed so far", () => {
    renderForm()
    const link = screen.getByRole('link', { name: 'Forgot your password?' })

    expect(link.parentElement).toBe(screen.getByText('Password').parentElement)
    expect(follows(screen.getByText('Password'), link)).toBe(true)
    expect(follows(link, screen.getByRole('button', { name: 'Sign in' }))).toBe(true)
    type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com')
    expect(link).toHaveAttribute('data-email', 'ada@example.com')
  })

  it("shows the page's notice below the button, where the answer to a sign-in takes its place", async () => {
    renderForm(
      vi.fn<Fetch>(async () => Response.json({ code: 'INVALID_EMAIL_OR_PASSWORD' }, { status: 401 })),
      'This confirmation link has expired.'
    )
    const notice = screen.getByRole('note')
    expect(follows(screen.getByRole('button', { name: 'Sign in' }), notice)).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('note')).toBeInTheDocument()

    signIn()

    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password is wrong.')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('asks for the email and the current password, the way password managers expect', () => {
    renderForm()
    const email = screen.getByRole('textbox', { name: 'Email' })

    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('on a submit with mistakes, says what to fix under each field, focuses the first and sends nothing', () => {
    const { fetch } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    const email = screen.getByRole('textbox', { name: 'Email' })
    expect(email).toHaveAccessibleDescription('Enter an email address, like ada@example.com.')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password.')
    expect(email).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('checks a field when it is left, only after the first submit and not on the way to a button', () => {
    renderForm()
    const button = screen.getByRole('button', { name: 'Sign in' })
    const email = screen.getByRole('textbox', { name: 'Email' })
    const emailError = 'Enter an email address, like ada@example.com.'

    type(email, 'ada@')
    fireEvent.focusOut(email)
    expect(screen.queryByText(emailError)).not.toBeInTheDocument()

    fireEvent.click(button)
    type(email, 'ada@example.com')
    fireEvent.focusOut(email, { relatedTarget: button })
    expect(screen.getByText(emailError)).toBeInTheDocument()

    fireEvent.focusOut(email)
    expect(screen.queryByText(emailError)).not.toBeInTheDocument()
  })

  it('sends the cleaned email and the password, and says when the user is in', async () => {
    const { fetch, onSignedIn } = renderForm()

    type(screen.getByRole('textbox', { name: 'Email' }), ' Ada@Example.com ')
    type(screen.getByLabelText('Password'), 'correct horse battery staple')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(onSignedIn).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/sign-in/email`)
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'ada@example.com',
      password: 'correct horse battery staple'
    })
  })

  it('stays disabled while the sign-in is on its way, so a second click sends nothing', async () => {
    let answer!: (response: Response) => void
    const fetch = vi.fn<Fetch>(() => new Promise((resolve) => (answer = resolve)))
    const { onSignedIn } = renderForm(fetch)
    const button = screen.getByRole('button', { name: 'Sign in' })

    type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com')
    type(screen.getByLabelText('Password'), 'correct horse battery staple')
    fireEvent.click(button)
    expect(button).toBeDisabled()
    fireEvent.click(button)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    answer(signedIn())

    await waitFor(() => expect(onSignedIn).toHaveBeenCalled())
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('says the email or password is wrong, without saying which, and keeps what was typed', async () => {
    const { onSignedIn } = renderForm(
      vi.fn<Fetch>(async () => Response.json({ code: 'INVALID_EMAIL_OR_PASSWORD' }, { status: 401 }))
    )

    signIn()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The email or password is wrong. Check them and try again.')
    expect(alert).toHaveFocus()
    expect(follows(screen.getByRole('button', { name: 'Sign in' }), alert)).toBe(true)
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('Ada@Example.com')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    expect(onSignedIn).not.toHaveBeenCalled()
  })

  it('offers to send the confirmation link again to the address, when the email is not confirmed yet', async () => {
    renderForm(vi.fn<Fetch>(async () => Response.json({ code: 'EMAIL_NOT_VERIFIED' }, { status: 403 })))

    signIn()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Confirm your email first: open the link we sent when you signed up')
    expect(within(alert).getByRole('button', { name: 'Send it again to ada@example.com' })).toBeInTheDocument()
  })

  it('says what else went wrong, and clears it on the next try', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json({ message: 'Too many requests.' }, { status: 429 }))
      .mockResolvedValueOnce(signedIn())
    const { onSignedIn } = renderForm(fetch)

    signIn()
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled())
  })

  it('goes on to the second step when the account has one, instead of signing in', async () => {
    const { onSignedIn, onSecondStep } = renderForm(
      vi.fn<Fetch>(async () => Response.json({ twoFactorRedirect: true, twoFactorMethods: ['totp'] }))
    )

    signIn()

    await waitFor(() => expect(onSecondStep).toHaveBeenCalled())
    expect(onSignedIn).not.toHaveBeenCalled()
  })
})
