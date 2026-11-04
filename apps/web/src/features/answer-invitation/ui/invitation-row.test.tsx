import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import { InvitationRow } from './invitation-row'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const invitation = { id: 'inv-1', organizationName: 'Acme', expiresAt: new Date('2026-11-11T12:00:00.000Z') }
const refused = (code: string) => Response.json({ code, message: code }, { status: 400 })

function renderRow(fetch: Fetch, locale: Locale = 'en') {
  const onAnswered = vi.fn()
  render(() => (
    <I18nProvider locale={locale}>
      <AuthProvider client={createAuthClient({ fetch })}>
        <InvitationRow invitation={invitation} onAnswered={onAnswered} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { onAnswered }
}

const accept = () => screen.getByRole('button', { name: 'Accept invitation to Acme' })
const decline = () => screen.getByRole('button', { name: 'Decline invitation to Acme' })

describe('InvitationRow', () => {
  it('names the organization and says when the invitation expires', () => {
    renderRow(vi.fn<Fetch>())

    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Expires on Nov 11, 2026')).toBeInTheDocument()
  })

  it('says the date in the language of the screen', () => {
    renderRow(vi.fn<Fetch>(), 'pt-BR')

    expect(screen.getByText('Expira em 11 de nov. de 2026')).toBeInTheDocument()
  })

  it('accepts the invitation and tells the screen', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ invitation: { id: 'inv-1' }, member: { id: 'm1' } }))
    const { onAnswered } = renderRow(fetch)

    fireEvent.click(accept())

    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith('accepted'))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/accept-invitation`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ invitationId: 'inv-1' })
  })

  it('declines the invitation and tells the screen', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ invitation: { id: 'inv-1' } }))
    const { onAnswered } = renderRow(fetch)

    fireEvent.click(decline())

    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith('declined'))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/reject-invitation`)
  })

  it('keeps both buttons disabled while the answer is on its way', async () => {
    let answer: (response: Response) => void = () => {}
    const fetch = vi.fn<Fetch>(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve
        })
    )
    renderRow(fetch)

    fireEvent.click(accept())

    expect(accept()).toBeDisabled()
    expect(decline()).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    answer(Response.json({}))
    await waitFor(() => expect(accept()).toBeEnabled())
  })

  it('says an invitation that expired or was withdrawn can no longer be answered', async () => {
    const { onAnswered } = renderRow(async () => refused('INVITATION_NOT_FOUND'))

    fireEvent.click(accept())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation expired or was withdrawn. Ask the person who invited you to send a new one.'
    )
    expect(onAnswered).not.toHaveBeenCalled()
  })

  it('says when the organization has no room for another member', async () => {
    renderRow(async () => refused('ORGANIZATION_MEMBERSHIP_LIMIT_REACHED'))

    fireEvent.click(accept())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This organization has reached its limit of members. Ask an owner to make room.'
    )
  })

  it('says anything else that goes wrong, and lets the user try again', async () => {
    renderRow(async () => Response.json({ code: 'BOOM' }, { status: 500 }))

    fireEvent.click(accept())

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/Something went wrong on our side/)).toBeInTheDocument()
    expect(accept()).toBeEnabled()
  })
})
