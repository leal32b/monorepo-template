import type { Customer } from '@repo/contracts'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { CustomerForm, type CustomerFormProps } from './customer-form'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const ada: Customer = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555',
  company: 'Engines',
  notes: 'First programmer.',
  createdAt: '2026-11-07T10:00:00.000Z',
  archivedAt: null
}
const refused = (code: string, status = 409) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code }, { status })

function renderForm(fetch: Fetch, props: Partial<CustomerFormProps> = {}) {
  const handlers = { onSaved: vi.fn(), onGone: vi.fn(), onCancel: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch })}>
        <CustomerForm organizationId="org-1" {...handlers} {...props} />
      </ApiProvider>
    </I18nProvider>
  ))
  return handlers
}

const field = (name: string) => screen.getByRole('textbox', { name })
const type = (name: string, value: string) => fireEvent.input(field(name), { target: { value } })
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>) => ({
  path: fetch.mock.calls[0]?.[0],
  method: fetch.mock.calls[0]?.[1]?.method,
  body: JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as unknown
})

describe('CustomerForm', () => {
  describe('adding', () => {
    it('asks for a name and the contact details, all empty', () => {
      renderForm(vi.fn<Fetch>())

      for (const name of ['Name', 'Email', 'Phone', 'Company', 'Notes']) expect(field(name)).toHaveValue('')
      expect(screen.getByRole('button', { name: 'Add customer' })).toBeInTheDocument()
    })

    it('adds the customer with what was typed, cleaned, and hands it back', async () => {
      const fetch = vi.fn<Fetch>(async () => Response.json(ada, { status: 201 }))
      const { onSaved } = renderForm(fetch)

      type('Name', '  Ada Lovelace ')
      type('Email', 'ADA@example.com')
      type('Phone', '555')
      type('Company', 'Engines')
      type('Notes', 'First programmer.')
      press('Add customer')

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(ada))
      expect(sent(fetch)).toEqual({
        path: '/api/organizations/org-1/customers',
        method: 'POST',
        body: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '555',
          company: 'Engines',
          notes: 'First programmer.'
        }
      })
    })

    it('asks for the name before sending anything, and puts focus on it', async () => {
      const fetch = vi.fn<Fetch>()
      renderForm(fetch)

      press('Add customer')

      expect(await screen.findByText('Enter the customer’s name.')).toBeInTheDocument()
      expect(field('Name')).toHaveFocus()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('says what is wrong with an email and a text that is too long, with their limits', async () => {
      renderForm(vi.fn<Fetch>())

      type('Name', 'Ada')
      type('Email', 'ada')
      type('Phone', 'a'.repeat(41))
      press('Add customer')

      expect(await screen.findByText('Enter an email like ana@example.com.')).toBeInTheDocument()
      expect(screen.getByText('Use up to 40 characters.')).toBeInTheDocument()
    })

    it('checks a field again when it is left after a first try, not while typing', async () => {
      renderForm(vi.fn<Fetch>())
      press('Add customer')
      await screen.findByText('Enter the customer’s name.')

      type('Name', 'Ada')
      expect(screen.getByText('Enter the customer’s name.')).toBeInTheDocument()

      fireEvent.focusOut(field('Name'), { relatedTarget: field('Email') })

      await waitFor(() => expect(screen.queryByText('Enter the customer’s name.')).not.toBeInTheDocument())
    })

    it('says an email is taken under the email, keeps what was typed, and clears it when the email changes', async () => {
      const fetch = vi.fn<Fetch>(async () => refused('customer_email_taken'))
      renderForm(fetch)

      type('Name', 'Ada')
      type('Email', 'ada@example.com')
      press('Add customer')

      expect(await screen.findByText('Another customer already has this email.')).toBeInTheDocument()
      expect(field('Email')).toHaveFocus()
      expect(field('Name')).toHaveValue('Ada')

      type('Email', 'ada2@example.com')

      expect(screen.queryByText('Another customer already has this email.')).not.toBeInTheDocument()
    })

    it('waits while the request is on its way', async () => {
      renderForm(() => new Promise(() => {}))
      type('Name', 'Ada')

      press('Add customer')

      await waitFor(() => expect(screen.getByRole('button', { name: 'Add customer' })).toBeDisabled())
    })

    it('says a role that does not allow it, and any other failure in the generic words', async () => {
      const fetch = vi.fn<Fetch>(async () => refused('permission_denied', 403))
      renderForm(fetch)
      type('Name', 'Ada')

      press('Add customer')

      expect(await screen.findByText('Your role does not allow this.')).toBeInTheDocument()
    })

    it('says an API out of reach in the generic words', async () => {
      renderForm(async () => {
        throw new TypeError('Failed to fetch')
      })
      type('Name', 'Ada')

      press('Add customer')

      expect(await screen.findByRole('alert')).toBeInTheDocument()
    })

    it('can be cancelled', () => {
      const { onCancel } = renderForm(vi.fn<Fetch>())

      press('Cancel')

      expect(onCancel).toHaveBeenCalledOnce()
    })
  })

  describe('editing', () => {
    it('starts from the customer, empty fields empty', () => {
      renderForm(vi.fn<Fetch>(), { customer: { ...ada, phone: null, company: null, notes: null } })

      expect(field('Name')).toHaveValue('Ada Lovelace')
      expect(field('Email')).toHaveValue('ada@example.com')
      expect(field('Phone')).toHaveValue('')
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    })

    it('sends the whole customer again, a cleared field left out', async () => {
      const fetch = vi.fn<Fetch>(async () => Response.json({ ...ada, phone: null }))
      const { onSaved } = renderForm(fetch, { customer: ada })

      type('Phone', '')
      press('Save changes')

      await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
      expect(sent(fetch)).toEqual({
        path: '/api/organizations/org-1/customers/c1',
        method: 'PUT',
        body: { name: 'Ada Lovelace', email: 'ada@example.com', company: 'Engines', notes: 'First programmer.' }
      })
    })

    it('tells the screen when the customer is gone, so it can read the list again', async () => {
      const { onGone } = renderForm(async () => refused('customer_not_found', 404), { customer: ada })

      press('Save changes')

      await waitFor(() => expect(onGone).toHaveBeenCalledOnce())
    })
  })
})
