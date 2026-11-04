import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ChangeAddressForm } from './change-address-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }
const refused = (code: string, status = 400) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch) {
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <ChangeAddressForm organization={acme} onSaved={onSaved} onCancel={onCancel} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { onSaved, onCancel }
}

const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>) =>
  JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<string, unknown>

const field = () => screen.getByRole('textbox', { name: 'Address' })
const type = (value: string) => fireEvent.input(field(), { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save address' }))

describe('ChangeAddressForm', () => {
  it('starts with the current address, and says first that old links stop working', () => {
    renderForm(vi.fn<Fetch>())

    expect(field()).toHaveValue('acme')
    expect(field()).toHaveAttribute('autocapitalize', 'none')
    expect(
      screen.getByText('Bookmarks and links that use the current address stop working once you change it.')
    ).toBeInTheDocument()
  })

  it('saves the new address, cleaned of spaces and capitals', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ ...acme, slug: 'acme-inc' }))
    const { onSaved } = renderForm(fetch)

    type('  Acme-Inc ')
    save()

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('acme-inc'))
    expect(sent(fetch)).toEqual({ organizationId: 'org-1', data: { slug: 'acme-inc' } })
  })

  it('closes without a request when the address is the one it already has', () => {
    const fetch = vi.fn<Fetch>()
    const { onCancel } = renderForm(fetch)

    type(' ACME ')
    save()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['empty', '', 'Enter an address.'],
    ['reserved', 'settings', 'This address is reserved. Choose another.'],
    ['malformed', 'acme inc', 'Use lowercase letters, numbers and single hyphens, up to 48 characters.']
  ])('says so under the field when the address is %s, and sends nothing', (_case, value, message) => {
    const fetch = vi.fn<Fetch>()
    renderForm(fetch)

    type(value)
    save()

    expect(field()).toHaveAccessibleDescription(message)
    expect(field()).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('marks an address someone else has on the field, and refuses it again without asking', async () => {
    const fetch = vi.fn<Fetch>(async () => refused('ORGANIZATION_SLUG_ALREADY_TAKEN'))
    const { onSaved } = renderForm(fetch)

    type('globex')
    save()

    await waitFor(() =>
      expect(field()).toHaveAccessibleDescription('Another organization already uses this address. Choose another.')
    )
    expect(onSaved).not.toHaveBeenCalled()
    save()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('waits while the request is on its way', async () => {
    renderForm(() => new Promise(() => {}))

    type('acme-inc')
    save()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save address' })).toBeDisabled())
  })

  it('says when the role no longer allows it', async () => {
    renderForm(async () => refused('YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION', 403))

    type('acme-inc')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You no longer have permission to do this. Ask an owner of the organization.'
    )
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    type('acme-inc')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
