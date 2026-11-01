import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { EnableTwoFactor } from './enable-two-factor'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const uri = 'otpauth://totp/Monorepo%20Template:ada%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Monorepo%20Template'
const backupCodes = ['a8Kd2-Xm9Qz', 'b7Le3-Yn8Ra']

/** Better Auth answering the password with an app to set up, and the app's first code with `verified`. */
function betterAuth(verified: () => Response = () => Response.json({ status: true })) {
  return vi.fn<Fetch>(async (input) =>
    String(input).endsWith('/two-factor/enable')
      ? Response.json({ method: 'totp', totpURI: uri, backupCodes })
      : verified()
  )
}

function renderSetup(fetch = betterAuth()) {
  const props = { onEnabled: vi.fn(), onAlreadyOn: vi.fn(), onSetup: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <EnableTwoFactor {...props} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { fetch, ...props }
}

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

/** Confirms the password, and waits for the app's setup. */
function setUp() {
  type(screen.getByLabelText('Your password'), 'my password')
  fireEvent.click(screen.getByRole('button', { name: 'Set up' }))
  return screen.findByRole('img', { name: 'QR code to add your account to an authenticator app' })
}

/** Types the app's code, and sends it. */
function turnOn(code: string) {
  type(screen.getByLabelText('6-digit code'), code)
  fireEvent.click(screen.getByRole('button', { name: 'Turn on' }))
}

describe('EnableTwoFactor', () => {
  it('lets the user cancel at the password, and again with the app on screen', async () => {
    const { onCancel } = renderSetup()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await setUp()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('tells the screen when the app is ready to connect, so it can show the step', async () => {
    const { onSetup } = renderSetup()
    expect(onSetup).not.toHaveBeenCalled()

    await setUp()

    expect(onSetup).toHaveBeenCalledTimes(1)
  })

  it('does not move on when Better Auth answers with nothing to set up', async () => {
    const { onSetup } = renderSetup(vi.fn<Fetch>(async () => Response.json({ method: 'otp' })))

    type(screen.getByLabelText('Your password'), 'my password')
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Set up' })).toBeEnabled())
    expect(onSetup).not.toHaveBeenCalled()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('after the password, shows the QR code, a link for this phone and the key to type', async () => {
    const { fetch } = renderSetup()

    await setUp()

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/two-factor/enable`)
    expect(JSON.parse(String(init?.body))).toEqual({ password: 'my password' })
    expect(screen.getByRole('link', { name: 'Open it in your authenticator app' })).toHaveAttribute('href', uri)
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(screen.getByText(/^Scan this QR code/)).toHaveFocus()
  })

  it('turns it on with the first code from the app, and hands over the backup codes', async () => {
    const { fetch, onEnabled } = renderSetup()
    await setUp()

    turnOn(' 123 456 ')

    await waitFor(() => expect(onEnabled).toHaveBeenCalledWith(backupCodes))
    const [url, init] = fetch.mock.calls[1] ?? []
    expect(String(url)).toBe(`${window.location.origin}/api/auth/two-factor/verify-totp`)
    expect(JSON.parse(String(init?.body))).toEqual({ code: '123456' })
  })

  it('says on the field when the code is not right, and does not send it again', async () => {
    const { fetch, onEnabled } = renderSetup(betterAuth(() => Response.json({ code: 'INVALID_CODE' }, { status: 401 })))
    await setUp()
    const field = screen.getByLabelText('6-digit code')

    turnOn('123456')

    await waitFor(() =>
      expect(field).toHaveAccessibleDescription('This code is not right. Enter the one your app shows now.')
    )
    expect(field).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }))
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onEnabled).not.toHaveBeenCalled()
  })

  it('says what else went wrong with the code below the button', async () => {
    renderSetup(betterAuth(() => Response.json({ code: 'TOO_MANY_REQUESTS' }, { status: 429 })))
    await setUp()

    turnOn('123456')

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })

  it('leaves the page to show it on, with nothing to set up, when it was turned on elsewhere meanwhile', async () => {
    const { onAlreadyOn } = renderSetup(
      vi.fn<Fetch>(async () => Response.json({ code: 'TOTP_ALREADY_ENABLED' }, { status: 400 }))
    )

    type(screen.getByLabelText('Your password'), 'my password')
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }))

    await waitFor(() => expect(onAlreadyOn).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
