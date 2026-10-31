import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RegenerateBackupCodes } from './regenerate-backup-codes'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const backupCodes = ['a8Kd2-Xm9Qz', 'b7Le3-Yn8Ra']

function renderForm(fetch = vi.fn<Fetch>(async () => Response.json({ status: true, backupCodes }))) {
  const props = { onRegenerated: vi.fn(), onAlreadyOff: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <RegenerateBackupCodes {...props} />
      </AuthProvider>
    </I18nProvider>
  ))
  fireEvent.input(screen.getByLabelText('Your password'), { target: { value: 'my password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Get new codes' }))
  return { fetch, ...props }
}

describe('RegenerateBackupCodes', () => {
  it('gets new codes with the password, saying the old ones stop working', async () => {
    const { fetch, onRegenerated } = renderForm()

    expect(screen.getByText(/replace the ones you have/)).toBeInTheDocument()
    await waitFor(() => expect(onRegenerated).toHaveBeenCalledWith(backupCodes))
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/two-factor/generate-backup-codes`)
    expect(JSON.parse(String(init?.body))).toEqual({ password: 'my password' })
  })

  it('leaves the page to show the second step off when it was turned off elsewhere meanwhile', async () => {
    const { onAlreadyOff, onRegenerated } = renderForm(
      vi.fn<Fetch>(async () => Response.json({ code: 'TWO_FACTOR_NOT_ENABLED' }, { status: 400 }))
    )

    await waitFor(() => expect(onAlreadyOff).toHaveBeenCalled())
    expect(onRegenerated).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
