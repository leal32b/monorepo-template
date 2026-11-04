import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RevokeInvitation } from './revoke-invitation'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const invitation = {
  id: 'inv-1',
  email: 'grace@example.com',
  roles: ['member'],
  expiresAt: new Date('2026-11-11T12:00:00.000Z')
}

function renderButton(fetch: Fetch, disabled?: boolean) {
  const handlers = { onRevoked: vi.fn(), onFailure: vi.fn(), onPending: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <RevokeInvitation invitation={invitation} {...(disabled ? { disabled } : {})} {...handlers} />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

describe('RevokeInvitation', () => {
  it('cancels the invitation by its id, with no question first', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ id: 'inv-1', status: 'canceled' }))
    const { onRevoked, onPending } = renderButton(fetch)

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(onRevoked).toHaveBeenCalledTimes(1))
    expect(onPending.mock.calls).toEqual([[true], [false]])
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/cancel-invitation`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ invitationId: 'inv-1' })
  })

  it('waits while the request is on its way', async () => {
    renderButton(() => new Promise(() => {}))

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Revoke' })).toBeDisabled())
  })

  it('can be kept from being pressed while another action is on', () => {
    renderButton(vi.fn<Fetch>(), true)

    expect(screen.getByRole('button', { name: 'Revoke' })).toBeDisabled()
  })

  it('tells what went wrong', async () => {
    const { onFailure, onRevoked } = renderButton(async () =>
      Response.json({ code: 'INVITATION_NOT_FOUND' }, { status: 400 })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() =>
      expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVITATION_NOT_FOUND' }))
    )
    expect(onRevoked).not.toHaveBeenCalled()
  })
})
