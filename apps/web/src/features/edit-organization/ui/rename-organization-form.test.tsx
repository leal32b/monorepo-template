import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { RenameOrganizationForm } from './rename-organization-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }
const refused = (code: string, status = 400) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch) {
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <RenameOrganizationForm organization={acme} onSaved={onSaved} onCancel={onCancel} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { onSaved, onCancel }
}

const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>) =>
  JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<string, unknown>

const field = () => screen.getByRole('textbox', { name: 'Organization name' })
const type = (value: string) => fireEvent.input(field(), { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save name' }))

describe('RenameOrganizationForm', () => {
  it('starts with the current name', () => {
    renderForm(vi.fn<Fetch>())

    expect(field()).toHaveValue('Acme')
    expect(field()).toHaveAttribute('autocomplete', 'off')
  })

  it('saves the new name, cleaned, for this organization', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ ...acme, name: 'Acme Inc' }))
    const { onSaved } = renderForm(fetch)

    type('  Acme Inc ')
    save()

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Acme Inc'))
    expect(sent(fetch)).toEqual({ organizationId: 'org-1', data: { name: 'Acme Inc' } })
  })

  it('closes without a request when the name is the one it already has', () => {
    const fetch = vi.fn<Fetch>()
    const { onCancel, onSaved } = renderForm(fetch)

    save()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSaved).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['empty', '', 'Enter a name for your organization.'],
    ['too long', 'a'.repeat(81), 'Use at most 80 characters.']
  ])('says so under the field when the name is %s, focuses it and sends nothing', (_case, value, message) => {
    const fetch = vi.fn<Fetch>()
    renderForm(fetch)

    type(value)
    save()

    expect(field()).toHaveAccessibleDescription(message)
    expect(field()).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits while the request is on its way', async () => {
    const fetch = vi.fn<Fetch>(() => new Promise(() => {}))
    renderForm(fetch)

    type('Acme Inc')
    save()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save name' })).toBeDisabled())
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('says when the role no longer allows it, keeping what was typed', async () => {
    const { onSaved } = renderForm(async () => refused('YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION', 403))

    type('Acme Inc')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You no longer have permission to do this. Ask an owner of the organization.'
    )
    expect(field()).toHaveValue('Acme Inc')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    type('Acme Inc')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
