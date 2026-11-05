import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { AnswerInvitation } from './answer-invitation'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const refused = (code: string) => Response.json({ code, message: code }, { status: 400 })

function renderAnswer(fetch: Fetch) {
  const onAnswered = vi.fn()
  const onGone = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <AnswerInvitation invitationId="inv-1" onAnswered={onAnswered} onGone={onGone} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { onAnswered, onGone }
}

const join = () => screen.getByRole('button', { name: 'Accept invitation' })
const decline = () => screen.getByRole('button', { name: 'Decline' })

describe('AnswerInvitation', () => {
  it('puts joining first, the action the screen is about, then declining', () => {
    renderAnswer(vi.fn<Fetch>())

    expect(join().compareDocumentPosition(decline()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('accepts the invitation and tells the screen', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ invitation: { id: 'inv-1' }, member: { id: 'm1' } }))
    const { onAnswered } = renderAnswer(fetch)

    fireEvent.click(join())

    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith('accepted'))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/accept-invitation`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ invitationId: 'inv-1' })
  })

  it('declines the invitation and tells the screen', async () => {
    const { onAnswered } = renderAnswer(async () => Response.json({ invitation: { id: 'inv-1' } }))

    fireEvent.click(decline())

    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith('declined'))
  })

  it('keeps both buttons disabled while the answer is on its way', () => {
    renderAnswer(() => new Promise<Response>(() => {}))

    fireEvent.click(join())

    expect(join()).toBeDisabled()
    expect(decline()).toBeDisabled()
  })

  it('asks the screen to read the invitation again when it closed meanwhile, instead of failing', async () => {
    const { onGone, onAnswered } = renderAnswer(async () => refused('INVITATION_NOT_FOUND'))

    fireEvent.click(join())

    await waitFor(() => expect(onGone).toHaveBeenCalled())
    expect(onAnswered).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says anything else that goes wrong in the usual words, and lets the user try again', async () => {
    renderAnswer(async () => Response.json({ code: 'BOOM' }, { status: 500 }))

    fireEvent.click(join())

    expect(await screen.findByRole('alert')).toHaveTextContent(/Something went wrong on our side/)
    expect(join()).toBeEnabled()
  })

  it('says below the buttons when the organization has no room for another member', async () => {
    renderAnswer(async () => Response.json({ code: 'ORGANIZATION_MEMBERSHIP_LIMIT_REACHED' }, { status: 403 }))

    fireEvent.click(join())

    expect(await screen.findByRole('alert')).toHaveTextContent('This organization has reached its limit of members.')
    expect(join()).toBeEnabled()
  })
})
