import { fireEvent, screen } from '@solidjs/testing-library'
import { type Fetch, problem, renderBackOffice, visitToAcme } from '../test-back-office'
import { RequireOperator } from './require-operator'

function renderAt(api: Fetch) {
  return renderBackOffice({
    at: '/admin',
    routes: [{ path: '/admin', component: () => <RequireOperator>The back office</RequireOperator> }],
    api
  })
}

describe('RequireOperator (ADR 0077)', () => {
  afterEach(() => window.localStorage.clear())

  it("draws the back office's frame for an operator, and keeps the visit the back office says is on", async () => {
    renderAt(async () => Response.json({ impersonation: visitToAcme }))

    expect(await screen.findByText('The back office')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Back office' })).toBeInTheDocument()
    expect(screen.getByText('You are viewing Acme as its owner sees it')).toBeInTheDocument()
    expect(window.localStorage.getItem('impersonation')).toBe('on')
  })

  it('shows "not found" to whoever is not an operator, as for any address the app does not have', async () => {
    renderAt(async () => problem(404, 'not_found'))

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.queryByText('The back office')).not.toBeInTheDocument()
  })

  it.each([
    ['two-factor', 'Your account has no two-step verification. Turn it on in Security, then sign in again.'],
    ['sign-in-method', 'Your account also signs in with Google, which asks for no code. Unlink it in Security.'],
    [
      'sign-in-again',
      'The back office needs a sign-in with your password and code from the last 12 hours, after you were made an operator.'
    ]
  ])(
    'tells an operator whose session may not open it why (%s), and signs them out to sign in again',
    async (reason, text) => {
      renderAt(async () => problem(403, 'operator_session_refused', { reason }))

      expect(await screen.findByText(text)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }))
      expect(await screen.findByText('Elsewhere: /login')).toBeInTheDocument()
    }
  )

  it('offers to try again when the back office could not be reached', async () => {
    let calls = 0
    renderAt(async () => (++calls === 1 ? problem(503, 'service_unavailable') : Response.json({ impersonation: null })))

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('The back office')).toBeInTheDocument()
  })
})
