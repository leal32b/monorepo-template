import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { InvitationFailure } from './invitation-failure'

const renderFailure = (code: string | undefined, status = 400) =>
  render(() => (
    <I18nProvider locale="en">
      <InvitationFailure failure={{ status, code, requestId: 'req-1' }} />
    </I18nProvider>
  ))

describe('InvitationFailure', () => {
  it('says in the screen’s own words a refusal it knows', () => {
    renderFailure('INVITATION_NOT_FOUND')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This invitation is no longer pending. The list has been updated.'
    )
  })

  it('says anything else in the usual words, with the code and the request to quote', () => {
    renderFailure('INTERNAL_SERVER_ERROR', 500)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    expect(screen.getByRole('alert')).toHaveTextContent('req-1')
  })
})
