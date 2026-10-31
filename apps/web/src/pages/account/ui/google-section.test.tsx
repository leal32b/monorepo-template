import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import type { AccountSecurity } from '#entities/accounts'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { GoogleSection } from './google-section'

const account: AccountSecurity = {
  email: 'ada@example.com',
  password: true,
  googleAccountId: undefined,
  twoFactor: false
}

/** The section, with the API saying whether Google is on, kept up to date as the page does. */
function renderSection(
  security: Partial<AccountSecurity>,
  { google = true, error = undefined as string | undefined } = {}
) {
  const [current, setCurrent] = createSignal({ ...account, ...security })
  const options = async () => Response.json({ google })
  const auth = async () => Response.json({ status: true })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: options })}>
        <AuthProvider client={createAuthClient({ fetch: auth })}>
          <MemoryRouter>
            <Route
              path="/"
              component={() => <GoogleSection security={current()} error={error} onChange={setCurrent} />}
            />
          </MemoryRouter>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
}

const section = () => screen.findByRole('region', { name: 'Google' })

describe('GoogleSection', () => {
  it('with Google on and not linked, offers to link it, and says why linking failed', async () => {
    renderSection({}, { error: 'access_denied' })

    const google = await section()
    expect(within(google).getByText(/^Not linked:/)).toBeInTheDocument()
    expect(within(google).getByRole('button', { name: 'Link Google' })).toBeInTheDocument()
    expect(within(google).getByRole('alert')).toHaveTextContent('Google was not linked: you cancelled at Google.')
  })

  it('leaves Google out while it is off and not linked', async () => {
    renderSection({}, { google: false })

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Google' })).not.toBeInTheDocument())
  })

  it('unlinks Google when the account has a password, and the state it lands on takes focus', async () => {
    renderSection({ googleAccountId: 'a1' })
    const google = await section()
    expect(within(google).getByText(/^Linked:/)).toBeInTheDocument()

    fireEvent.click(within(google).getByRole('button', { name: 'Unlink Google' }))

    await waitFor(() => expect(within(google).getByText(/^Not linked:/)).toHaveFocus())
  })

  it('keeps Google linked while it is the only way to sign in, and says so, even with Google now off', async () => {
    renderSection({ password: false, googleAccountId: 'a1' }, { google: false })

    const google = await section()
    expect(within(google).getByText(/until you create a password/)).toBeInTheDocument()
    expect(within(google).queryByRole('button', { name: 'Unlink Google' })).not.toBeInTheDocument()
  })
})
