import { render, screen, within } from '@solidjs/testing-library'
import type { AuthFailure } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { AuthFailureAlert, type AuthFailureAlertProps } from './auth-failure-alert'

function renderAlert(failure: AuthFailure, more: Omit<AuthFailureAlertProps, 'failure'> = {}) {
  render(() => (
    <I18nProvider locale="en">
      <AuthFailureAlert failure={failure} {...more} />
    </I18nProvider>
  ))
  return screen.getByRole('alert')
}

describe('AuthFailureAlert', () => {
  it('says the server could not be reached, and to check the connection', () => {
    const alert = renderAlert({ status: undefined, code: undefined, requestId: undefined })

    expect(alert).toHaveTextContent('We could not reach the server. Check your connection and try again.')
  })

  it('says to wait after too many attempts', () => {
    const alert = renderAlert({ status: 429, code: undefined, requestId: 'req-1' })

    expect(alert).toHaveTextContent('Too many attempts. Wait a minute, then try again.')
    expect(alert).not.toHaveTextContent('req-1')
  })

  it('says anything else went wrong on our side, with what support needs to find it', () => {
    const alert = renderAlert({ status: 500, code: 'INTERNAL_SERVER_ERROR', requestId: 'req-1' })

    expect(alert).toHaveTextContent('Something went wrong on our side. Try again in a moment.')
    expect(alert).toHaveTextContent('If it keeps happening, tell support: INTERNAL_SERVER_ERROR · req-1')
  })

  it('leaves the reference out when the answer did not come from the API', () => {
    const alert = renderAlert({ status: 502, code: undefined, requestId: undefined })

    expect(alert).not.toHaveTextContent('tell support')
  })

  it('takes focus when it appears, so the keyboard goes on from the message', () => {
    const alert = renderAlert({ status: 500, code: undefined, requestId: 'req-1' })

    expect(alert).toHaveFocus()
  })

  it("uses the screen's own words when it has them, with the action it offers and no reference", () => {
    const alert = renderAlert(
      { status: 403, code: 'EMAIL_NOT_VERIFIED', requestId: 'req-1' },
      { message: 'Confirm your email first.', action: <button type="button">Send it again</button> }
    )

    expect(alert).toHaveTextContent('Confirm your email first.')
    expect(alert).not.toHaveTextContent('req-1')
    expect(within(alert).getByRole('button', { name: 'Send it again' })).toBeInTheDocument()
  })
})
