import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ChangePasswordForm } from './change-password-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Better Auth's answer to a change: done, the other sessions ended, a new one for this device. */
const changed = () => Response.json({ token: 'session', user: { id: 'u1' } })

function renderForm(fetch = vi.fn<Fetch>(async () => changed())) {
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <ChangePasswordForm />
      </AuthProvider>
    </I18nProvider>
  ))
  return {
    fetch,
    current: screen.getByLabelText('Current password'),
    next: screen.getByLabelText('New password'),
    button: screen.getByRole('button', { name: 'Change password' })
  }
}

/** Better Auth refusing the change with `code`. */
const refused = (code: string, status = 400) => vi.fn<Fetch>(async () => Response.json({ code }, { status }))

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

/** Fills both passwords right, and sends them. */
function change(fields: { current: HTMLElement; next: HTMLElement; button: HTMLElement }) {
  type(fields.current, 'an old password')
  type(fields.next, 'correct horse battery staple')
  fireEvent.click(fields.button)
}

describe('ChangePasswordForm', () => {
  it('asks for the current password and a new one, the way password managers expect', () => {
    const { current, next } = renderForm()

    expect(current).toHaveAttribute('autocomplete', 'current-password')
    expect(next).toHaveAttribute('autocomplete', 'new-password')
    expect(next).toHaveAccessibleDescription('At least 15 characters.')
  })

  it('on a submit with mistakes, says what to fix under each field and sends nothing', () => {
    const { fetch, current, next, button } = renderForm()

    type(next, 'too short')
    fireEvent.click(button)

    expect(current).toHaveAccessibleDescription('Enter your password.')
    expect(next).toHaveAccessibleDescription(/Use at least 15 characters\./)
    expect(current).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('changes it, signing out the other devices, and says so with the fields cleared', async () => {
    const fields = renderForm()

    change(fields)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your password was changed. Your other devices were signed out.'
    )
    expect(fields.current).toHaveValue('')
    expect(fields.next).toHaveValue('')
    const [url, init] = fields.fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/change-password`)
    expect(JSON.parse(String(init?.body))).toEqual({
      currentPassword: 'an old password',
      newPassword: 'correct horse battery staple',
      revokeOtherSessions: true
    })
  })

  it('says on its field when the current password is wrong, and does not send it again', async () => {
    const fields = renderForm(refused('INVALID_PASSWORD'))

    change(fields)

    await waitFor(() => expect(fields.current).toHaveAccessibleDescription('This is not your current password.'))
    expect(fields.current).toHaveFocus()
    fireEvent.click(fields.button)
    expect(fields.button).toBeEnabled()
  })

  it('says on its field when the new password was found in a data breach', async () => {
    const fields = renderForm(refused('PASSWORD_COMPROMISED'))

    change(fields)

    await waitFor(() => expect(fields.next).toHaveAccessibleDescription(/This password has appeared in a data breach/))
  })

  it('says what else went wrong below the button', async () => {
    const fields = renderForm(refused('', 429))

    change(fields)

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })
})
