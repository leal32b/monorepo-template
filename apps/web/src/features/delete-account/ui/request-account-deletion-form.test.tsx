import type { AccountDeletion } from '@repo/contracts'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RequestAccountDeletionForm } from './request-account-deletion-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const plan: AccountDeletion = {
  organizations: [
    { id: 'org-1', name: 'Alone', slug: 'alone', outcome: 'deleted' },
    { id: 'org-2', name: 'Shared', slug: 'shared', outcome: 'left' }
  ]
}

function renderForm(fetch: Fetch) {
  const handlers = { onSent: vi.fn(), onBlocked: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <RequestAccountDeletionForm plan={plan} email="ada@example.com" {...handlers} />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const send = () => fireEvent.click(screen.getByRole('button', { name: 'Email me the link' }))

describe('RequestAccountDeletionForm', () => {
  it('says what goes, what it leaves, that it cannot be undone and where the link goes', () => {
    renderForm(vi.fn<Fetch>())

    expect(
      screen.getByText(
        'Your account, how you sign in and your two-step verification are deleted. Organizations where you are ' +
          'the only member go too, with everything in them: Alone. You leave these organizations: Shared. It ' +
          'cannot be undone. We will email ada@example.com a link to confirm.'
      )
    ).toBeInTheDocument()
  })

  it('asks Better Auth to email the link, and deletes nothing itself', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ success: true, message: 'Verification email sent' }))
    const { onSent } = renderForm(fetch)

    send()

    await waitFor(() => expect(onSent).toHaveBeenCalledOnce())
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/delete-user`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({})
  })

  it('tells the screen when an organization came to block it, so it reads the outcome again', async () => {
    const { onBlocked, onSent } = renderForm(async () =>
      Response.json({ code: 'SOLE_OWNER_OF_SHARED_ORGANIZATION' }, { status: 403 })
    )

    send()

    await waitFor(() => expect(onBlocked).toHaveBeenCalledOnce())
    expect(onSent).not.toHaveBeenCalled()
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    send()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })
})
