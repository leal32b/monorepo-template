import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import type { SignUpValues } from '../model/validate-sign-up'
import { SignUpForm } from './sign-up-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth's answer to a sign-up: the same for a new email and a taken one (T08). */
const signedUp = () => Response.json({ token: null, user: { id: 'u1', email: 'ada@example.com', name: 'Ada' } })

function renderForm({
  fetch = vi.fn<Fetch>(async () => signedUp()),
  locale = 'en' as Locale,
  initial = undefined as SignUpValues | undefined
} = {}) {
  const onSignedUp = vi.fn()
  render(() => (
    <I18nProvider locale={locale}>
      <AuthProvider client={createAuthClient({ fetch })}>
        <SignUpForm initial={initial} onSignedUp={onSignedUp} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { fetch, onSignedUp }
}

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

/** True when `later` comes after `earlier` in the document, as it is read and laid out. */
const follows = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING)

/** Fills the English form with a sign-up that passes every check. */
function fillIn() {
  type(screen.getByRole('textbox', { name: 'Name' }), 'Ada Lovelace')
  type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com')
  type(screen.getByLabelText('Password'), 'correct horse battery staple')
}

describe('SignUpForm', () => {
  it('asks for a name, an email and a new password, the way browsers and password managers expect', () => {
    renderForm()
    const password = screen.getByLabelText('Password')

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('autocomplete', 'name')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('autocomplete', 'email')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveAccessibleDescription('At least 15 characters.')
  })

  it('on a submit with mistakes, says what to fix under each field, focuses the first and sends nothing', () => {
    const { fetch } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const name = screen.getByRole('textbox', { name: 'Name' })
    expect(name).toHaveAccessibleDescription('Enter your name.')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Enter an email address, like ada@example.com.'
    )
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(/Use at least 15 characters\./)
    expect(name).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('checks a field when it is left only after the first submit, so typing never shows an error', () => {
    renderForm()
    const email = screen.getByRole('textbox', { name: 'Email' })
    const emailError = 'Enter an email address, like ada@example.com.'

    type(email, 'ada@')
    fireEvent.focusOut(email)
    expect(screen.queryByText(emailError)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    type(email, 'ada@example.com')
    fireEvent.focusOut(email)

    expect(screen.queryByText(emailError)).not.toBeInTheDocument()
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
  })

  it('does not check again on the way to a button, so errors above it do not move it from under the click', () => {
    renderForm()
    const button = screen.getByRole('button', { name: 'Create account' })
    const name = screen.getByRole('textbox', { name: 'Name' })

    fireEvent.click(button)
    type(name, 'Ada Lovelace')
    fireEvent.focusOut(name, { relatedTarget: button })

    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
  })

  it("sends the sign-up in the user's language, with the email cleaned, and says where the link went", async () => {
    const { fetch, onSignedUp } = renderForm({ locale: 'pt-BR' })

    type(screen.getByRole('textbox', { name: 'Nome' }), 'Ada Lovelace')
    type(screen.getByRole('textbox', { name: 'E-mail' }), ' Ada@Example.com ')
    type(screen.getByLabelText('Senha'), 'correct horse battery staple')
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() =>
      expect(onSignedUp).toHaveBeenCalledWith({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'correct horse battery staple'
      })
    )
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/sign-up/email`)
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct horse battery staple',
      locale: 'pt-BR',
      callbackURL: '/'
    })
  })

  it('stays disabled while the sign-up is on its way, so a second click sends nothing', async () => {
    let answer!: (response: Response) => void
    const fetch = vi.fn<Fetch>(() => new Promise((resolve) => (answer = resolve)))
    const { onSignedUp } = renderForm({ fetch })
    const button = screen.getByRole('button', { name: 'Create account' })

    fillIn()
    fireEvent.click(button)
    expect(button).toBeDisabled()
    fireEvent.click(button)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    answer(signedUp())

    await waitFor(() => expect(onSignedUp).toHaveBeenCalled())
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('says on the password field when the API found the password in a data breach, and keeps the rest', async () => {
    renderForm({ fetch: vi.fn<Fetch>(async () => Response.json({ code: 'PASSWORD_COMPROMISED' }, { status: 400 })) })
    const password = screen.getByLabelText('Password')

    fillIn()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(password).toHaveFocus())
    expect(password).toHaveAccessibleDescription(
      /This password has appeared in a data breach\. Choose a different one\./
    )
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada Lovelace')
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })

  it('says what else went wrong below the button, and keeps what was typed for another try', async () => {
    const fetch = vi.fn<Fetch>(async () =>
      Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500, headers: { 'X-Request-Id': 'req-1' } })
    )
    const { onSignedUp } = renderForm({ fetch })
    const button = screen.getByRole('button', { name: 'Create account' })

    fillIn()
    fireEvent.click(button)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong on our side.')
    expect(alert).toHaveTextContent('INTERNAL_SERVER_ERROR · req-1')
    expect(follows(button, alert)).toBe(true)
    expect(button).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('ada@example.com')
    expect(onSignedUp).not.toHaveBeenCalled()
  })

  it('clears the last failure when the form is sent again', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json({ message: 'Too many requests.' }, { status: 429 }))
      .mockResolvedValueOnce(signedUp())
    const { onSignedUp } = renderForm({ fetch })
    const button = screen.getByRole('button', { name: 'Create account' })

    fillIn()
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
    fireEvent.click(button)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(onSignedUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.com' })))
  })

  it('starts with the values it is given, so another try only changes what was wrong', async () => {
    const initial = { name: 'Ada Lovelace', email: 'ada@exmaple.com', password: 'correct horse battery staple' }
    const { onSignedUp } = renderForm({ initial })
    const email = screen.getByRole('textbox', { name: 'Email' })

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada Lovelace')
    expect(email).toHaveValue('ada@exmaple.com')
    type(email, 'ada@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(onSignedUp).toHaveBeenCalledWith({ ...initial, email: 'ada@example.com' }))
  })
})
