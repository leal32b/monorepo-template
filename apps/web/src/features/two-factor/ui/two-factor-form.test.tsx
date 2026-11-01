import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { TwoFactorForm } from './two-factor-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth's answer to a right code: the session is made. */
const verified = () => Response.json({ token: 'session', user: { id: 'u1' } })

/** The form for one `method`, in a sign-in headed to `/projects`. */
function renderForm(fetch = vi.fn<Fetch>(async () => verified()), method: 'app' | 'backup' = 'app') {
  const onVerified = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <TwoFactorForm method={method} onVerified={onVerified} signInAgain="/login?next=%2Fprojects" />
      </AuthProvider>
    </I18nProvider>
  ))
  return {
    fetch,
    onVerified,
    code: screen.getByRole('textbox', { name: method === 'app' ? '6-digit code' : 'Backup code' }),
    button: screen.getByRole('button', { name: 'Verify' })
  }
}

/** Better Auth refusing the code with `code`. */
const refused = (code: string, status = 401) => vi.fn<Fetch>(async () => Response.json({ code }, { status }))

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

describe('TwoFactorForm', () => {
  it('asks for the code with the numeric keypad, and offers no suggestions', () => {
    const { code } = renderForm()

    expect(code).toHaveAttribute('inputmode', 'numeric')
    expect(code).toHaveAttribute('autocomplete', 'off')
  })

  it('on a submit with anything but six digits, says what to type and sends nothing', () => {
    const { fetch, code, button } = renderForm()

    type(code, '12345')
    fireEvent.click(button)

    expect(code).toHaveAccessibleDescription('Enter the 6 digits your app shows.')
    expect(code).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the code without its spaces, once at a time, and says when the user is in', async () => {
    let answer!: (response: Response) => void
    const fetch = vi.fn<Fetch>(() => new Promise((resolve) => (answer = resolve)))
    const { onVerified, code, button } = renderForm(fetch)

    type(code, '123 456')
    fireEvent.click(button)
    expect(button).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    answer(verified())

    await waitFor(() => expect(onVerified).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/two-factor/verify-totp`)
    expect(JSON.parse(String(init?.body))).toEqual({ code: '123456' })
  })

  it('says on the field when the code is wrong, and does not send that one again', async () => {
    const { code, button } = renderForm(
      vi.fn<Fetch>(async () => Response.json({ code: 'INVALID_CODE' }, { status: 401 }))
    )

    type(code, '123456')
    fireEvent.click(button)

    await waitFor(() =>
      expect(code).toHaveAccessibleDescription('This code is not right. Enter the one your app shows now.')
    )
    expect(code).toHaveFocus()
    fireEvent.click(button)
    expect(button).toBeEnabled()
  })

  it('says what else went wrong below the button', async () => {
    const { code, button } = renderForm(
      vi.fn<Fetch>(async () => Response.json({ message: 'Too many requests.' }, { status: 429 }))
    )

    type(code, '123456')
    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })

  it('asks for a backup code as it was saved, without the phone changing its letters', () => {
    const { code } = renderForm(undefined, 'backup')

    expect(code).toHaveAttribute('autocapitalize', 'off')
    expect(code).toHaveAttribute('autocomplete', 'off')
    expect(code).not.toHaveAttribute('inputmode')
  })

  it('sends a backup code, with its dash, to its own check', async () => {
    const { fetch, onVerified, code, button } = renderForm(undefined, 'backup')

    type(code, 'a8Kd2Xm9Qz')
    fireEvent.click(button)

    await waitFor(() => expect(onVerified).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/two-factor/verify-backup-code`)
    expect(JSON.parse(String(init?.body))).toEqual({ code: 'a8Kd2-Xm9Qz' })
  })

  it('says on the field when the backup code is wrong or used, and does not send it again', async () => {
    const { code, button } = renderForm(refused('INVALID_BACKUP_CODE'), 'backup')

    type(code, 'a8Kd2-Xm9Qz')
    fireEvent.click(button)

    await waitFor(() =>
      expect(code).toHaveAccessibleDescription(/This backup code is not right, or it was already used/)
    )
    expect(code).toHaveFocus()
    fireEvent.click(button)
    expect(button).toBeEnabled()
  })

  it('says when the sign-in has expired, with the way to sign in again', async () => {
    const { code, button } = renderForm(refused('INVALID_TWO_FACTOR_COOKIE'))

    type(code, '123456')
    fireEvent.click(button)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This sign-in has expired. Sign in again to get a new code.')
    expect(within(alert).getByRole('link', { name: 'Sign in again' })).toHaveAttribute(
      'href',
      '/login?next=%2Fprojects'
    )
  })

  it('says when too many wrong codes locked the account for a while', async () => {
    const { code, button } = renderForm(refused('ACCOUNT_TEMPORARILY_LOCKED', 429))

    type(code, '123456')
    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many wrong codes. For your safety, wait 15 minutes, then sign in again.'
    )
  })
})
