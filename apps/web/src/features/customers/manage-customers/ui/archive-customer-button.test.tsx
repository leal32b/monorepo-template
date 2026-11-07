import type { Customer } from '@repo/contracts'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ArchiveCustomerButton, type ArchiveCustomerButtonProps } from './archive-customer-button'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const ada: Customer = {
  id: 'c1',
  name: 'Ada',
  email: null,
  phone: null,
  company: null,
  notes: null,
  createdAt: '2026-11-07T10:00:00.000Z',
  archivedAt: null
}
const refused = (code: string, status = 409) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code }, { status })

function renderButton(fetch: Fetch, props: Partial<ArchiveCustomerButtonProps> = {}) {
  const handlers = { onDone: vi.fn(), onChanged: vi.fn(), onRefused: vi.fn() }
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch })}>
        <ArchiveCustomerButton organizationId="org-1" customer={ada} mode="archive" {...handlers} {...props} />
      </ApiProvider>
    </I18nProvider>
  ))
  return handlers
}

const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('ArchiveCustomerButton', () => {
  it('archives with one press, asking nothing first, and hands the customer back', async () => {
    const archived = { ...ada, archivedAt: '2026-11-08T10:00:00.000Z' }
    const fetch = vi.fn<Fetch>(async () => Response.json(archived))
    const { onDone } = renderButton(fetch)

    press('Archive')

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(archived))
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org-1/customers/c1/archive')
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST')
  })

  it('restores when it is in restore mode', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json(ada))
    const { onDone } = renderButton(fetch, {
      mode: 'restore',
      customer: { ...ada, archivedAt: '2026-11-08T10:00:00.000Z' }
    })

    press('Restore')

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(ada))
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org-1/customers/c1/restore')
  })

  it('waits while the request is on its way, and while the screen says so', async () => {
    renderButton(() => new Promise(() => {}))

    press('Archive')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled())
  })

  it('can be disabled by the screen', () => {
    renderButton(vi.fn<Fetch>(), { disabled: true })

    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled()
  })

  it.each([
    ['customer_not_found', 404],
    ['customer_already_archived', 409]
  ])('tells the screen to read the list again when the answer is %s', async (code, status) => {
    const { onChanged, onDone } = renderButton(async () => refused(code, status))

    press('Archive')

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce())
    expect(onDone).not.toHaveBeenCalled()
  })

  it('says a role that does not allow it, and anything else in the generic words', async () => {
    const denied = renderButton(async () => refused('permission_denied', 403))
    press('Archive')
    await waitFor(() => expect(denied.onRefused).toHaveBeenCalledWith('Your role does not allow this.'))
  })

  it('says anything else in the generic words', async () => {
    const { onRefused } = renderButton(async () => {
      throw new TypeError('Failed to fetch')
    })

    press('Archive')

    await waitFor(() => expect(onRefused).toHaveBeenCalledOnce())
    expect(onRefused.mock.calls[0]?.[0]).not.toBe('Your role does not allow this.')
  })
})
