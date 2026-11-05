import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { LeaveOrganizationForm } from './leave-organization-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }

function renderForm(fetch: Fetch) {
  const handlers = { onLeft: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <LeaveOrganizationForm organization={acme} {...handlers} />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const leave = () => fireEvent.click(screen.getByRole('button', { name: 'Leave organization' }))

describe('LeaveOrganizationForm', () => {
  it('says what leaving costs', () => {
    renderForm(vi.fn<Fetch>())

    expect(
      screen.getByText('Leave Acme? You lose access right away, and need a new invitation to come back.')
    ).toBeInTheDocument()
  })

  it('leaves the organization', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ id: 'm1' }))
    const { onLeft } = renderForm(fetch)

    leave()

    await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/leave`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ organizationId: 'org-1' })
  })

  it('waits while the request is on its way', async () => {
    renderForm(() => new Promise(() => {}))

    leave()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Leave organization' })).toBeDisabled())
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('says why the only owner cannot leave', async () => {
    const { onLeft } = renderForm(async () =>
      Response.json({ code: 'YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER' }, { status: 400 })
    )

    leave()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The organization needs an owner. Make someone else an owner first.'
    )
    expect(onLeft).not.toHaveBeenCalled()
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    leave()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
