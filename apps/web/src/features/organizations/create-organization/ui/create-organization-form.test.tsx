import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { AuthProvider, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { CreateOrganizationForm } from './create-organization-form'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const created = (slug: string) => Response.json({ id: 'org-1', name: 'Acme Inc', slug, members: [] })
const refused = (code: string, status = 400) => Response.json({ code, message: code }, { status })

function renderForm(fetch: Fetch) {
  const onCreated = vi.fn()
  render(() => (
    <I18nProvider locale="en">
      <AuthProvider client={createAuthClient({ fetch })}>
        <CreateOrganizationForm onCreated={onCreated} />
      </AuthProvider>
    </I18nProvider>
  ))
  return { onCreated }
}

const sent = (fetch: ReturnType<typeof vi.fn<Fetch>>, call = 0) =>
  JSON.parse(String(fetch.mock.calls[call]?.[1]?.body)) as Record<string, unknown>

const submit = (name: string) => {
  fireEvent.input(screen.getByRole('textbox', { name: 'Organization name' }), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: 'Create organization' }))
}

describe('CreateOrganizationForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks for the name, with the time zone and currency already chosen, and offers no suggestions for the name', () => {
    renderForm(vi.fn<Fetch>())

    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Organization name' })).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveAccessibleDescription(
      'Dates and times show in this zone for everyone.'
    )
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveAccessibleDescription(
      'New amounts use this currency. You can change both later.'
    )
  })

  it('takes the time zone from the browser and guesses the currency from its language', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'America/Sao_Paulo'
    } as Intl.ResolvedDateTimeFormatOptions)
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
    renderForm(vi.fn<Fetch>())

    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveValue('America/Sao_Paulo')
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('BRL')
  })

  it('creates the organization with the time zone and currency chosen', async () => {
    const fetch = vi.fn<Fetch>(async () => created('acme'))
    const { onCreated } = renderForm(fetch)

    fireEvent.change(screen.getByRole('combobox', { name: 'Time zone' }), { target: { value: 'Europe/Lisbon' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Currency' }), { target: { value: 'EUR' } })
    submit('Acme')

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('acme'))
    expect(sent(fetch)).toMatchObject({ timeZone: 'Europe/Lisbon', currency: 'EUR' })
  })

  it.each([
    ['INVALID_TIME_ZONE', 'Choose a time zone from the list.'],
    ['INVALID_CURRENCY', 'Choose a currency from the list.']
  ])('says what to do when the API refuses a setting (%s)', async (code, message) => {
    renderForm(async () => refused(code))

    submit('Acme')

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('on an empty name, says so under the field, focuses it and sends nothing', () => {
    const fetch = vi.fn<Fetch>()
    renderForm(fetch)

    fireEvent.click(screen.getByRole('button', { name: 'Create organization' }))

    const field = screen.getByRole('textbox', { name: 'Organization name' })
    expect(field).toHaveAccessibleDescription('Enter a name for your organization.')
    expect(field).toHaveFocus()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('on a name that is too long, asks for a shorter one', () => {
    renderForm(vi.fn<Fetch>())

    submit('a'.repeat(81))

    expect(screen.getByRole('textbox', { name: 'Organization name' })).toHaveAccessibleDescription(
      'Use at most 80 characters.'
    )
  })

  it('creates the organization with the slug its name suggests, without making it the active one', async () => {
    const fetch = vi.fn<Fetch>(async () => created('acme-inc'))
    const { onCreated } = renderForm(fetch)

    submit('  Acme Inc ')

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('acme-inc'))
    expect(sent(fetch)).toEqual({
      name: 'Acme Inc',
      slug: 'acme-inc',
      timeZone: expect.any(String),
      currency: 'USD',
      keepCurrentActiveOrganization: true
    })
  })

  it('keeps the button disabled while the organization is being created', async () => {
    let answer: (response: Response) => void = () => {}
    const fetch = vi.fn<Fetch>(
      (input) =>
        new Promise<Response>((resolve) => {
          if (String(input).endsWith('/organization/create')) answer = resolve
          else resolve(Response.json(null))
        })
    )
    renderForm(fetch)

    submit('Acme')

    expect(screen.getByRole('button', { name: 'Create organization' })).toBeDisabled()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    answer(created('acme'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create organization' })).toBeEnabled())
  })

  it('tries another slug, with a short suffix, when someone else has taken the first', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(refused('ORGANIZATION_ALREADY_EXISTS'))
      .mockResolvedValueOnce(created('acme-i'))
    const { onCreated } = renderForm(fetch)

    submit('Acme')

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(sent(fetch, 1).slug))
    expect(sent(fetch, 0).slug).toBe('acme')
    expect(sent(fetch, 1).slug).toMatch(/^acme-[a-z0-9]{4}$/)
  })

  it('gives up after a few taken slugs and says something went wrong', async () => {
    const fetch = vi.fn<Fetch>(async () => refused('ORGANIZATION_ALREADY_EXISTS'))
    const { onCreated } = renderForm(fetch)

    submit('Acme')

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side')
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('says when the user belongs to as many organizations as allowed', async () => {
    renderForm(async () => refused('YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS', 403))

    submit('Acme')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You belong to as many organizations as allowed. Leave one to create another.'
    )
  })

  it('says anything else that goes wrong, keeping the name', async () => {
    renderForm(async () => Response.json({ code: 'BOOM' }, { status: 500 }))

    submit('Acme')

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side')
    expect(screen.getByRole('textbox', { name: 'Organization name' })).toHaveValue('Acme')
  })
})
