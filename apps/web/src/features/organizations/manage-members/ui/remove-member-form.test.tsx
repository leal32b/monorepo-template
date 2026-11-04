import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import type { Member } from '#entities/organizations'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RemoveMemberForm } from './remove-member-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const grace: Member = {
  id: 'm2',
  userId: 'u2',
  name: 'Grace',
  email: 'grace@example.com',
  roles: ['member'],
  createdAt: new Date('2026-11-04T12:00:00.000Z')
}
const refused = (code: string, status = 403) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch) {
  const handlers = { onRemoved: vi.fn(), onGone: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <RemoveMemberForm organizationId="org-1" organizationName="Acme" member={grace} {...handlers} />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const remove = () => fireEvent.click(screen.getByRole('button', { name: 'Remove member' }))

describe('RemoveMemberForm', () => {
  it('says who goes, from what, and that access ends at once', () => {
    renderForm(vi.fn<Fetch>())

    expect(screen.getByText('Remove Grace from Acme? They lose access right away.')).toBeInTheDocument()
  })

  it('removes the member', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ member: { id: 'm2' } }))
    const { onRemoved } = renderForm(fetch)

    remove()

    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/remove-member`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      organizationId: 'org-1',
      memberIdOrEmail: 'm2'
    })
  })

  it('waits while the request is on its way, so a second click cannot repeat it', async () => {
    renderForm(() => new Promise(() => {}))

    remove()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove member' })).toBeDisabled())
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('says when the person outranks the caller', async () => {
    const { onRemoved } = renderForm(async () => refused('MEMBER_OUTRANKS_YOU'))

    remove()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot do this with this person. Your role may have changed.'
    )
    expect(onRemoved).not.toHaveBeenCalled()
  })

  it('tells the screen when the person is no longer a member', async () => {
    const { onGone } = renderForm(async () => refused('MEMBER_NOT_FOUND', 400))

    remove()

    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1))
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    remove()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
