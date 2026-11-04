import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { DeleteRoleForm } from './delete-role-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const editor = { name: 'editor', permissions: { ac: ['read' as const] }, builtIn: false }
const refused = (code: string, status = 400) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch) {
  const handlers = { onDeleted: vi.fn(), onGone: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <DeleteRoleForm organizationId="org-1" role={editor} {...handlers} />
      </AuthProvider>
    </I18nProvider>
  ))
  return handlers
}

const remove = () => fireEvent.click(screen.getByRole('button', { name: 'Delete role' }))

describe('DeleteRoleForm', () => {
  it('says nobody holds the role, so nobody loses access', () => {
    renderForm(vi.fn<Fetch>())

    expect(screen.getByText('Delete the role editor? Nobody holds it, so no one loses access.')).toBeInTheDocument()
  })

  it('deletes the role by its name', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ success: true }))
    const { onDeleted } = renderForm(fetch)

    remove()

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/delete-role`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ organizationId: 'org-1', roleName: 'editor' })
  })

  it('waits while the request is on its way', async () => {
    renderForm(() => new Promise(() => {}))

    remove()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete role' })).toBeDisabled())
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('says when somebody was given the role meanwhile', async () => {
    const { onDeleted } = renderForm(async () => refused('ROLE_IN_USE'))

    remove()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Members or invitations hold this role now. Give them another role first.'
    )
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('tells the screen when the role no longer exists', async () => {
    const { onGone } = renderForm(async () => refused('ROLE_NOT_FOUND'))

    remove()

    await waitFor(() => expect(onGone).toHaveBeenCalledTimes(1))
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    remove()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
