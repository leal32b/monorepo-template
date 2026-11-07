import type { Customer } from '@repo/contracts'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { DeleteCustomerForm } from './delete-customer-form'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const ada: Customer = {
  id: 'c1',
  name: 'Ada',
  email: null,
  phone: null,
  company: null,
  notes: null,
  createdAt: '2026-11-07T10:00:00.000Z',
  archivedAt: '2026-11-08T10:00:00.000Z'
}
const refused = (code: string, status = 409) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code }, { status })

function renderForm(fetch: Fetch) {
  const handlers = { onDeleted: vi.fn(), onChanged: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch })}>
        <DeleteCustomerForm organizationId="org-1" customer={ada} {...handlers} />
      </ApiProvider>
    </I18nProvider>
  ))
  return handlers
}

const remove = () => fireEvent.click(screen.getByRole('button', { name: 'Delete customer' }))

describe('DeleteCustomerForm', () => {
  it('says the details cannot be recovered', () => {
    renderForm(vi.fn<Fetch>())

    expect(screen.getByText('Delete Ada for good? Their details and notes cannot be recovered.')).toBeInTheDocument()
  })

  it('deletes the customer', async () => {
    const fetch = vi.fn<Fetch>(async () => new Response(null, { status: 204 }))
    const { onDeleted } = renderForm(fetch)

    remove()

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org-1/customers/c1')
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('DELETE')
  })

  it('waits while the request is on its way', async () => {
    renderForm(() => new Promise(() => {}))

    remove()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete customer' })).toBeDisabled())
  })

  it.each([
    ['customer_not_found', 404],
    ['customer_not_archived', 409]
  ])('tells the screen to read the list again when the answer is %s', async (code, status) => {
    const { onChanged, onDeleted } = renderForm(async () => refused(code, status))

    remove()

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce())
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('says a role that does not allow it', async () => {
    renderForm(async () => refused('permission_denied', 403))

    remove()

    expect(await screen.findByText('Your role does not allow this.')).toBeInTheDocument()
  })

  it('says anything else in the generic words, and can be cancelled', async () => {
    const { onCancel } = renderForm(async () => {
      throw new TypeError('Failed to fetch')
    })

    remove()
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
