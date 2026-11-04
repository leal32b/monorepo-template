import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { DeleteOrganizationForm } from './delete-organization-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme Inc', slug: 'acme' }
const refused = (code: string, status = 403) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch) {
  const onDeleted = vi.fn()
  const onCancel = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <DeleteOrganizationForm organization={acme} onDeleted={onDeleted} onCancel={onCancel} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { onDeleted, onCancel }
}

const field = () => screen.getByRole('textbox', { name: 'Type the organization name to confirm' })
const type = (value: string) => fireEvent.input(field(), { target: { value } })
const remove = () => fireEvent.click(screen.getByRole('button', { name: 'Delete organization' }))

describe('DeleteOrganizationForm', () => {
  it('says what goes, for whom and that it cannot be undone, before asking for the name', () => {
    renderForm(vi.fn<Fetch>())

    expect(
      screen.getByText('This removes Acme Inc and everything in it, for all its members. It cannot be undone.')
    ).toBeInTheDocument()
    expect(field()).toHaveValue('')
  })

  it('deletes this organization once its name is typed', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ id: 'org-1' }))
    const { onDeleted } = renderForm(fetch)

    type(' Acme Inc ')
    remove()

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/organization/delete`)
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ organizationId: 'org-1' })
  })

  it.each([
    ['nothing', ''],
    ['a different case', 'acme inc'],
    ['another name', 'Globex']
  ])('refuses %s, shows the name to type, focuses the field and deletes nothing', (_case, typed) => {
    const fetch = vi.fn<Fetch>()
    renderForm(fetch)

    type(typed)
    remove()

    expect(field()).toHaveAccessibleDescription('The name does not match. Type it exactly as shown: Acme Inc')
    expect(field()).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits while the request is on its way, so a second click cannot repeat it', async () => {
    renderForm(() => new Promise(() => {}))

    type('Acme Inc')
    remove()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete organization' })).toBeDisabled())
  })

  it('checks the name again when the field is left after a submit', () => {
    renderForm(vi.fn<Fetch>())
    const field = screen.getByRole('textbox')
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }))
    expect(field).toHaveAttribute('aria-invalid', 'true')

    fireEvent.input(field, { target: { value: 'Acme Inc' } })
    fireEvent.focusOut(field)

    expect(field).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it.each([['ONLY_AN_OWNER_DELETES'], ['YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION']])(
    'says only an owner can delete when the API answers %s',
    async (code) => {
      const { onDeleted } = renderForm(async () => refused(code))

      type('Acme Inc')
      remove()

      expect(await screen.findByRole('alert')).toHaveTextContent('Only an owner can delete the organization.')
      expect(onDeleted).not.toHaveBeenCalled()
    }
  )

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    type('Acme Inc')
    remove()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })

  it('says it when the API cannot be reached', async () => {
    renderForm(async () => {
      throw new Error('offline')
    })

    type('Acme Inc')
    remove()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
