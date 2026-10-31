import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { DisableTwoFactor } from './disable-two-factor'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function renderForm(fetch = vi.fn<Fetch>(async () => Response.json({ status: true }))) {
  const onDisabled = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <DisableTwoFactor onDisabled={onDisabled} />
      </AuthProvider>
    </I18nProvider>
  ))
  fireEvent.input(screen.getByLabelText('Your password'), { target: { value: 'my password' } })
  return { fetch, onDisabled, button: screen.getByRole('button', { name: 'Turn off two-step verification' }) }
}

describe('DisableTwoFactor', () => {
  it('says what turning it off changes, then turns it off with the password', async () => {
    const { fetch, onDisabled, button } = renderForm()

    expect(screen.getByText(/asks only for your password again/)).toBeInTheDocument()
    expect(button).toHaveClass('bg-destructive')
    fireEvent.click(button)

    await waitFor(() => expect(onDisabled).toHaveBeenCalled())
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/two-factor/disable`)
    expect(JSON.parse(String(init?.body))).toEqual({ password: 'my password' })
  })

  it('keeps it on when the password is wrong, and says so on the field', async () => {
    const { onDisabled, button } = renderForm(
      vi.fn<Fetch>(async () => Response.json({ code: 'INVALID_PASSWORD' }, { status: 400 }))
    )

    fireEvent.click(button)

    await waitFor(() =>
      expect(screen.getByLabelText('Your password')).toHaveAccessibleDescription(/This is not your current password\./)
    )
    expect(onDisabled).not.toHaveBeenCalled()
  })
})
