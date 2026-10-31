import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { TwoFactorSection } from './two-factor-section'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const on: AccountSecurity = { email: 'ada@example.com', password: true, googleAccountId: undefined, twoFactor: true }
const backupCodes = ['a8Kd2-Xm9Qz', 'b7Le3-Yn8Ra']

/** Better Auth turning the second step off, or giving new codes, unless `codes` answers otherwise. */
function betterAuth(codes = () => Response.json({ status: true, backupCodes })) {
  return vi.fn<Fetch>(async (input) =>
    String(input).endsWith('/two-factor/generate-backup-codes') ? codes() : Response.json({ status: true })
  )
}

/** The section, kept up to date by its own changes as the page does. */
function renderSection(fetch = betterAuth()) {
  const [security, setSecurity] = createSignal(on)
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <TwoFactorSection security={security()} onChange={setSecurity} />
      </AuthProvider>
    </I18nProvider>
  ))
  return screen.getByRole('region', { name: 'Two-step verification' })
}

/** Opens an action, and confirms it with the password. */
function confirm(section: HTMLElement, open: string, submit: string) {
  fireEvent.click(within(section).getByRole('button', { name: open }))
  fireEvent.input(within(section).getByLabelText('Your password'), { target: { value: 'my password' } })
  fireEvent.click(within(section).getByRole('button', { name: submit }))
}

describe('TwoFactorSection', () => {
  it('with the second step on, offers new backup codes and turning it off, each opening its form below', () => {
    const section = renderSection()
    const codes = within(section).getByRole('button', { name: 'Get new backup codes' })
    const off = within(section).getByRole('button', { name: 'Turn off' })

    expect(within(section).queryByLabelText('Your password')).not.toBeInTheDocument()
    fireEvent.click(codes)
    expect(codes).toHaveAttribute('aria-expanded', 'true')
    expect(within(section).getByRole('button', { name: 'Get new codes' })).toBeInTheDocument()

    fireEvent.click(off)
    expect(codes).toHaveAttribute('aria-expanded', 'false')
    expect(within(section).getByRole('button', { name: 'Turn off two-step verification' })).toBeInTheDocument()

    fireEvent.click(off)
    expect(off).toHaveAttribute('aria-expanded', 'false')
    expect(within(section).queryByLabelText('Your password')).not.toBeInTheDocument()
  })

  it('shows new backup codes once, then goes back to the state', async () => {
    const section = renderSection()

    confirm(section, 'Get new backup codes', 'Get new codes')

    expect(await within(section).findByText(/^Your new backup codes are ready\./)).toHaveFocus()
    expect(within(section).queryByRole('button', { name: 'Turn off' })).not.toBeInTheDocument()
    fireEvent.click(within(section).getByRole('button', { name: 'I saved them' }))
    expect(within(section).getByText(/^On:/)).toHaveFocus()
    expect(within(section).getByRole('button', { name: 'Get new backup codes' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('turns it off with the password, and the state it lands on takes focus', async () => {
    const section = renderSection()

    confirm(section, 'Turn off', 'Turn off two-step verification')

    await waitFor(() => expect(within(section).getByText(/^Off:/)).toHaveFocus())
    expect(within(section).getByRole('button', { name: 'Set up' })).toBeInTheDocument()
  })

  it('shows it off when it was turned off elsewhere meanwhile', async () => {
    const section = renderSection(betterAuth(() => Response.json({ code: 'TWO_FACTOR_NOT_ENABLED' }, { status: 400 })))

    confirm(section, 'Get new backup codes', 'Get new codes')

    await waitFor(() => expect(within(section).getByText(/^Off:/)).toHaveFocus())
  })
})
