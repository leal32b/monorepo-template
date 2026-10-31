import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ResetPasswordForm } from './reset-password-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth's answer to a new password: changed, and every session of the account ended (T10). */
const changed = () => Response.json({ status: true })

/** The form for the link with the token `t0k3n`. */
function renderForm(fetch = vi.fn<Fetch>(async () => changed())) {
  const onReset = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <MemoryRouter>
          <Route
            path="*"
            component={() => <ResetPasswordForm token="t0k3n" onReset={onReset} askAgain="/forgot-password" />}
          />
        </MemoryRouter>
      </AuthProvider>
    </I18nProvider>
  ))
  return {
    fetch,
    onReset,
    password: screen.getByLabelText('New password'),
    button: screen.getByRole('button', { name: 'Change password' })
  }
}

/** Better Auth refusing the password with `code`. */
const refused = (code: string, status = 400) => vi.fn<Fetch>(async () => Response.json({ code }, { status }))

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

describe('ResetPasswordForm', () => {
  it('asks for a new password the way password managers expect, with the rule up front', () => {
    const { password } = renderForm()

    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveAccessibleDescription('At least 15 characters.')
  })

  it('on a submit with a short password, says so and sends nothing', () => {
    const { fetch, password, button } = renderForm()

    type(password, 'too short')
    fireEvent.click(button)

    expect(password).toHaveAccessibleDescription(/Use at least 15 characters\./)
    expect(password).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the new password with the token of the link, once at a time, and says when it is changed', async () => {
    let answer!: (response: Response) => void
    const fetch = vi.fn<Fetch>(() => new Promise((resolve) => (answer = resolve)))
    const { onReset, password, button } = renderForm(fetch)

    type(password, 'correct horse battery staple')
    fireEvent.click(button)
    expect(button).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    answer(changed())

    await waitFor(() => expect(onReset).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/reset-password`)
    expect(JSON.parse(String(init?.body))).toEqual({ newPassword: 'correct horse battery staple', token: 't0k3n' })
  })

  it('says on the field when the password was found in a data breach, and does not send it again', async () => {
    const { password, button } = renderForm(refused('PASSWORD_COMPROMISED'))

    type(password, 'correct horse battery staple')
    fireEvent.click(button)

    await waitFor(() => expect(password).toHaveAccessibleDescription(/This password has appeared in a data breach/))
    expect(password).toHaveFocus()
    fireEvent.click(button)
    expect(button).toBeEnabled()
  })

  it('says when the link has expired or was used, with the way to ask for a new one', async () => {
    const { password, button } = renderForm(refused('INVALID_TOKEN'))

    type(password, 'correct horse battery staple')
    fireEvent.click(button)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This link has expired or was already used.')
    expect(within(alert).getByRole('link', { name: 'Ask for a new link' })).toHaveAttribute('href', '/forgot-password')
  })

  it('says what else went wrong below the button', async () => {
    const { password, button } = renderForm(refused('', 429))

    type(password, 'correct horse battery staple')
    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })
})
