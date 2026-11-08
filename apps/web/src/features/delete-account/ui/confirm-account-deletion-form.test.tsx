import type { AccountDeletion } from '@repo/contracts'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { hasSession, rememberSession } from '#entities/sessions'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ConfirmAccountDeletionForm } from './confirm-account-deletion-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const plan: AccountDeletion = { organizations: [] }
const refused = (code: string, status: number) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch) {
  const handlers = { onDeleted: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <ConfirmAccountDeletionForm token="tok-1" plan={plan} {...handlers} />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }))

describe('ConfirmAccountDeletionForm', () => {
  it('says once more what goes before the button', () => {
    renderForm(vi.fn<Fetch>())

    expect(
      screen.getByText('Your account, how you sign in and your two-step verification are deleted. It cannot be undone.')
    ).toBeInTheDocument()
  })

  it('sends the link’s token back, forgets the session on this device, and tells the screen', async () => {
    rememberSession()
    const fetch = vi.fn<Fetch>(async () => Response.json({ success: true, message: 'User deleted' }))
    const { onDeleted } = renderForm(fetch)

    confirm()

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/delete-user`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ token: 'tok-1' })
    expect(hasSession()).toBe(false)
  })

  it.each([
    ['INVALID_TOKEN', 404],
    ['FAILED_TO_GET_USER_INFO', 404]
  ])('says a link that cannot be used (%s) has expired, with the way to a new one', async (code, status) => {
    const { onDeleted } = renderForm(async () => refused(code, status))

    confirm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This link has expired or was already used. Ask for a new one in your profile.'
    )
    expect(screen.getByRole('link', { name: 'Go to your profile' })).toHaveAttribute('href', '/settings/profile')
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('says an organization now blocks it, with the way to the profile', async () => {
    renderForm(async () => refused('SOLE_OWNER_OF_SHARED_ORGANIZATION', 403))

    confirm()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You are now the only owner of an organization you share.'
    )
    expect(screen.getByRole('link', { name: 'Go to your profile' })).toBeInTheDocument()
  })

  it('says anything else in the usual words, without a link', async () => {
    renderForm(async () => refused('INTERNAL_SERVER_ERROR', 500))

    confirm()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    expect(screen.queryByRole('link', { name: 'Go to your profile' })).not.toBeInTheDocument()
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })
})
