import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { ChangeSettingForm } from './change-setting-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'America/Sao_Paulo', currency: 'BRL' as const }
const refused = (code: string, status = 400) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch, setting: 'timeZone' | 'currency' = 'timeZone') {
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <ChangeSettingForm organization={acme} setting={setting} onSaved={onSaved} onCancel={onCancel} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { onSaved, onCancel }
}

const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>) =>
  JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<string, unknown>

const zone = () => screen.getByRole('combobox', { name: 'Time zone' })
const currency = () => screen.getByRole('combobox', { name: 'Currency' })

describe('ChangeSettingForm', () => {
  it('starts on the current time zone, and says what a change does to saved dates', () => {
    renderForm(vi.fn<Fetch>())

    expect(zone()).toHaveValue('America/Sao_Paulo')
    expect(zone()).toHaveAccessibleDescription('Saved dates and times keep their moment and show in the new zone.')
  })

  it('saves a new time zone for this organization', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ ...acme, timeZone: 'Europe/Lisbon' }))
    const { onSaved } = renderForm(fetch)

    fireEvent.change(zone(), { target: { value: 'Europe/Lisbon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save time zone' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Europe/Lisbon'))
    expect(sent(fetch)).toEqual({ organizationId: 'org-1', data: { timeZone: 'Europe/Lisbon' } })
  })

  it('starts on the current currency, named in the reader’s language, and saves a new one', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ ...acme, currency: 'EUR' }))
    const { onSaved } = renderForm(fetch, 'currency')

    expect(currency()).toHaveValue('BRL')
    expect(screen.getByRole('option', { name: 'Brazilian Real (BRL)' })).toBeInTheDocument()
    expect(currency()).toHaveAccessibleDescription('New amounts use it. Amounts already saved keep their own currency.')
    fireEvent.change(currency(), { target: { value: 'EUR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save currency' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('EUR'))
    expect(sent(fetch)).toEqual({ organizationId: 'org-1', data: { currency: 'EUR' } })
  })

  it('closes without a request when the value is the one it already has', () => {
    const fetch = vi.fn<Fetch>()
    const { onCancel, onSaved } = renderForm(fetch)

    fireEvent.click(screen.getByRole('button', { name: 'Save time zone' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSaved).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits while the request is on its way', async () => {
    renderForm(vi.fn<Fetch>(() => new Promise(() => {})))

    fireEvent.change(zone(), { target: { value: 'Europe/Lisbon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save time zone' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save time zone' })).toBeDisabled())
  })

  it('leaves through Cancel', () => {
    const { onCancel } = renderForm(vi.fn<Fetch>())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      'timeZone',
      'Europe/Lisbon',
      'YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION',
      403,
      'You no longer have permission'
    ],
    ['timeZone', 'Europe/Lisbon', 'INVALID_TIME_ZONE', 400, 'Choose a time zone from the list.'],
    ['currency', 'EUR', 'INVALID_CURRENCY', 400, 'Choose a currency from the list.']
  ] as const)('says what to do when the API refuses a %s (%s, %s)', async (setting, value, code, status, message) => {
    const { onSaved } = renderForm(async () => refused(code, status), setting)

    fireEvent.change(setting === 'timeZone' ? zone() : currency(), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: setting === 'timeZone' ? 'Save time zone' : 'Save currency' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('says anything else in the usual words', async () => {
    renderForm(async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }))

    fireEvent.change(zone(), { target: { value: 'Europe/Lisbon' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save time zone' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })
})
