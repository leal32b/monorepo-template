import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ResendInvitation } from './resend-invitation'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const invitation = {
  id: 'inv-1',
  email: 'grace@example.com',
  roles: ['member', 'editor'],
  expiresAt: new Date('2026-11-11T12:00:00.000Z')
}

function renderButton(fetch: Fetch, disabled?: boolean) {
  const handlers = { onSent: vi.fn(), onFailure: vi.fn(), onPending: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <ResendInvitation
          organizationId="org-1"
          invitation={invitation}
          {...(disabled ? { disabled } : {})}
          {...handlers}
        />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

describe('ResendInvitation', () => {
  it('sends the invitation again to the same address with the same roles, asking the API to resend', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ id: 'inv-1' }))
    const { onSent, onPending } = renderButton(fetch)

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1))
    expect(onPending.mock.calls).toEqual([[true], [false]])
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/invite-member`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      organizationId: 'org-1',
      email: 'grace@example.com',
      role: ['member', 'editor'],
      resend: true
    })
  })

  it('waits while the request is on its way, so a second click cannot send twice', async () => {
    renderButton(() => new Promise(() => {}))

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Resend' })).toBeDisabled())
  })

  it('can be kept from being pressed while another action is on', () => {
    renderButton(vi.fn<Fetch>(), true)

    expect(screen.getByRole('button', { name: 'Resend' })).toBeDisabled()
  })

  it('tells what went wrong', async () => {
    const { onFailure, onSent } = renderButton(async () =>
      Response.json({ code: 'TOO_MANY_INVITATIONS' }, { status: 429 })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }))

    await waitFor(() =>
      expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOO_MANY_INVITATIONS' }))
    )
    expect(onSent).not.toHaveBeenCalled()
  })
})
