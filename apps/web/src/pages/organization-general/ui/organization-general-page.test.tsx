import { builtInRoles, type OrganizationMembership, type Permissions } from '@repo/contracts'
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library'
import type { Locale } from '#shared/config'
import { membershipOf } from '../../../test-membership'
import { renderOrganizationPage } from '../../../test-organization-page'
import { OrganizationGeneralPage } from './organization-general-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'America/Sao_Paulo', currency: 'BRL' as const }
const globex = { id: 'org-2', name: 'Globex', slug: 'globex', timeZone: 'UTC', currency: 'USD' as const }

type Options = {
  permissions?: Permissions
  auth?: Fetch
  locale?: Locale
  api?: (input: string, init?: RequestInit) => Promise<Response>
  /** The organization's logo, as the membership carries it (ADR 0076). */
  logo?: OrganizationMembership['logo']
  /** Read only while its plan is unpaid (ADR 0063). */
  readOnly?: boolean
}

/** The export routes in memory (ADR 0074): what GET answers, in turn, and what POST answers. */
function exportApi(reads: unknown[], post: () => Response = () => Response.json(pending, { status: 202 })) {
  const calls: string[] = []
  let read = 0
  const api = async (input: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${input}`)
    if (init?.method === 'POST') return post()
    const answer = reads[Math.min(read++, reads.length - 1)]
    return answer instanceof Response ? answer : Response.json(answer)
  }
  return { api, calls }
}

const pending = {
  status: 'pending',
  requestedAt: '2026-11-19T12:00:00.000Z',
  nextRequestAt: '2099-01-01T12:15:00.000Z'
}
const ready = {
  status: 'ready',
  requestedAt: '2026-11-19T12:00:00.000Z',
  expiresAt: '2026-11-26T12:00:05.000Z',
  size: 2_400_000,
  nextRequestAt: null
}

/** The page at `/acme/settings/general` for a caller with `permissions`, and Better Auth answering through `fetch`. */
function renderPage({
  permissions = builtInRoles.owner,
  auth,
  locale = 'en',
  api = exportApi([{ status: 'none' }]).api,
  logo = null,
  readOnly = false
}: Options = {}) {
  const authFetch: Fetch =
    auth ??
    (async (input) =>
      String(input).includes('/organization/list') ? Response.json([acme, globex]) : Response.json({ status: true }))
  const rendered = renderOrganizationPage({
    page: OrganizationGeneralPage,
    path: '/settings/general',
    organization: acme,
    auth: authFetch,
    api,
    locale,
    membership: (() => {
      const membership = membershipOf(['member'], permissions as OrganizationMembership['permissions'])
      const access = readOnly ? 'read-only' : membership.subscription.access
      return { ...membership, logo, subscription: { ...membership.subscription, access } }
    })()
  })
  refreshed = rendered.refresh
  return rendered.history
}

/** How the page asks for the membership again, as the last `renderPage` drew it (ADR 0076: the logo). */
let refreshed: () => Promise<undefined>

const details = () => within(screen.getByRole('region', { name: 'Organization' }))
const regional = () => within(screen.getByRole('region', { name: 'Time and money' }))
const data = async () => within(await screen.findByRole('region', { name: 'Your data' }))

/** Every kind of space as a plain one: ICU versions differ on which space goes before PM. */
const spaced = (text: string | null) => text?.replace(/\s/g, ' ')

describe('OrganizationGeneralPage', () => {
  it('shows an owner the name and the address with their buttons, and the deletion', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument()
    expect(details().getByText('Acme')).toBeInTheDocument()
    expect(details().getByText('/acme')).toBeInTheDocument()
    expect(details().getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(details().getByRole('button', { name: 'Change address' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Delete organization' })).toBeInTheDocument()
  })

  it('shows an admin the buttons to change, and no deletion', () => {
    renderPage({ permissions: builtInRoles.admin })

    expect(details().getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Delete organization' })).not.toBeInTheDocument()
  })

  it('shows a plain member the details and why they cannot change them', () => {
    renderPage({ permissions: builtInRoles.member })

    expect(screen.getByText('You can see these details. Owners and admins can change them.')).toBeInTheDocument()
    expect(details().getByText('Acme')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change address' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Delete organization' })).not.toBeInTheDocument()
  })

  it('opens one form at a time, below its row, and gives focus to it', async () => {
    renderPage()

    fireEvent.click(details().getByRole('button', { name: 'Rename' }))

    expect(await screen.findByRole('group', { name: 'Rename' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Organization name' })).toHaveValue('Acme')
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change address' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete organization' })).toBeDisabled()
  })

  it.each([['Rename'], ['Change address']])(
    'closes the form of %s from Cancel, and hands focus back to the button that opened it',
    async (opener) => {
      renderPage()
      fireEvent.click(details().getByRole('button', { name: opener }))

      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.getByRole('button', { name: opener })).toHaveFocus())
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    }
  )

  it('renames the organization: says so in the row, and the side menu shows the new name', async () => {
    renderPage()
    fireEvent.click(details().getByRole('button', { name: 'Rename' }))
    fireEvent.input(await screen.findByRole('textbox', { name: 'Organization name' }), {
      target: { value: 'Acme Inc' }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Name saved')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rename' })).toHaveFocus())
  })

  it('changes the address: says so, and moves the page to it', async () => {
    const history = renderPage()
    fireEvent.click(details().getByRole('button', { name: 'Change address' }))
    fireEvent.input(await screen.findByRole('textbox', { name: 'Address' }), { target: { value: 'acme-inc' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save address' }))

    expect(await screen.findByText('Address saved')).toBeInTheDocument()
    await waitFor(() => expect(history.get()).toBe('/acme-inc/settings/general'))
  })

  it('deletes the organization after its name is typed, and leaves for the root', async () => {
    const auth = vi.fn<Fetch>(async (input) =>
      String(input).includes('/organization/list') ? Response.json([acme, globex]) : Response.json({ id: 'org-1' })
    )
    const history = renderPage({ auth })
    fireEvent.click(screen.getByRole('button', { name: 'Delete organization' }))
    fireEvent.input(await screen.findByRole('textbox', { name: 'Type the organization name to confirm' }), {
      target: { value: 'Acme' }
    })

    fireEvent.click(
      within(screen.getByRole('group', { name: 'Delete organization' })).getByRole('button', {
        name: 'Delete organization'
      })
    )

    expect(await screen.findByText('The root')).toBeInTheDocument()
    await waitFor(() => expect(history.get()).toBe('/'))
  })

  it('closes the deletion from Cancel without deleting', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Delete organization' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete organization' })).toHaveFocus())
  })

  describe('time and money (ADR 0053)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-11T17:30:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows the time zone with the time there now, and the currency with an amount in it', () => {
      renderPage()

      expect(spaced(regional().getByText(/America\/Sao Paulo/).textContent)).toBe(
        'America/Sao Paulo · now Nov 11, 2026, 2:30 PM GMT-3'
      )
      expect(spaced(regional().getByText(/Brazilian Real/).textContent)).toBe('Brazilian Real (BRL) · R$1,234.56')
      expect(regional().getByRole('button', { name: 'Change time zone' })).toBeInTheDocument()
      expect(regional().getByRole('button', { name: 'Change currency' })).toBeInTheDocument()
    })

    it('shows a plain member the settings and why they cannot change them', () => {
      renderPage({ permissions: builtInRoles.member })

      expect(screen.getByText('You can see these settings. Owners and admins can change them.')).toBeInTheDocument()
      expect(regional().queryByRole('button')).not.toBeInTheDocument()
    })

    it.each([
      ['Change time zone', 'Time zone', 'Europe/Lisbon', 'Save time zone', 'Time zone saved'],
      ['Change currency', 'Currency', 'EUR', 'Save currency', 'Currency saved']
    ])('%s: saves it, says so in the row and gives focus back', async (opener, label, value, save, saved) => {
      const auth = vi.fn<Fetch>(async (input) =>
        String(input).includes('/organization/list') ? Response.json([acme, globex]) : Response.json(acme)
      )
      renderPage({ auth })
      fireEvent.click(regional().getByRole('button', { name: opener }))
      fireEvent.change(await screen.findByRole('combobox', { name: label }), { target: { value } })

      fireEvent.click(screen.getByRole('button', { name: save }))

      expect(await screen.findByText(saved)).toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: opener })).toHaveFocus())
    })

    it('closes a setting’s form from Cancel', async () => {
      renderPage()
      fireEvent.click(regional().getByRole('button', { name: 'Change currency' }))

      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.getByRole('button', { name: 'Change currency' })).toHaveFocus())
    })

    it('writes them in the reader’s language', () => {
      renderPage({ locale: 'pt-BR' })

      expect(spaced(screen.getByText(/Real brasileiro/).textContent)).toBe('Real brasileiro (BRL) · R$ 1.234,56')
      expect(spaced(screen.getByText(/agora/).textContent)).toBe(
        'America/Sao Paulo · agora 11 de nov. de 2026, 14:30 BRT'
      )
    })
  })

  it('speaks the language of the provider', () => {
    renderPage({ locale: 'pt-BR' })

    expect(screen.getByRole('heading', { level: 1, name: 'Geral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renomear' })).toBeInTheDocument()
  })

  describe('the export of the data (ADR 0074)', () => {
    afterEach(() => vi.useRealTimers())

    it('shows the owner what it holds and the button to ask, and nobody else the section', async () => {
      renderPage()

      const section = await data()
      expect(await section.findByText(/A zip file with a spreadsheet for each kind of record/)).toBeInTheDocument()
      expect(section.getByRole('button', { name: 'Export data' })).toBeEnabled()
    })

    it('shows an admin no export', () => {
      renderPage({ permissions: builtInRoles.admin })

      expect(screen.queryByRole('region', { name: 'Your data' })).not.toBeInTheDocument()
    })

    it('asks, says it is being prepared, reads again until it is ready, then offers the download', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { api, calls } = exportApi([{ status: 'none' }, pending, ready])
      renderPage({ api })
      const section = await data()

      fireEvent.click(await section.findByRole('button', { name: 'Export data' }))

      expect(await section.findByText(/Being prepared/)).toBeInTheDocument()
      expect(section.queryByRole('button', { name: 'Export data' })).not.toBeInTheDocument()
      vi.advanceTimersByTime(3_000)
      const download = await section.findByRole('link', { name: 'Download' })
      expect(download).toHaveAttribute('href', '/api/organizations/org-1/export/file')
      expect(section.getByText('Ready to download until Nov 26, 2026 (2.4 MB).')).toBeInTheDocument()
      expect(section.getByRole('button', { name: 'Export again' })).toBeEnabled()
      expect(calls).toContain('POST /api/organizations/org-1/export')
    })

    it('waits within 15 minutes of the last request, saying from when, for a screen reader too', async () => {
      renderPage({ api: exportApi([{ ...ready, nextRequestAt: '2099-01-01T12:15:00.000Z' }]).api })
      const section = await data()

      const again = await section.findByRole('button', { name: 'Export again' })
      expect(again).toBeDisabled()
      expect(again).toHaveAccessibleDescription(/You can ask for a new one from Jan 1, 2099/)
    })

    it('opens the button again by itself when the 15 minutes are over', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const soon = new Date(Date.now() + 60_000).toISOString()
      renderPage({ api: exportApi([{ ...ready, nextRequestAt: soon }, ready]).api })
      const section = await data()
      expect(await section.findByRole('button', { name: 'Export again' })).toBeDisabled()

      vi.advanceTimersByTime(60_000)

      await waitFor(() => expect(section.getByRole('button', { name: 'Export again' })).toBeEnabled())
    })

    it('says when an expired export was deleted, with the way to ask again', async () => {
      renderPage({ api: exportApi([{ ...ready, status: 'expired', size: undefined }]).api })

      expect(
        await (await data()).findByText('The last export was deleted on Nov 26, 2026. Ask for a new one.')
      ).toBeInTheDocument()
    })

    it('reads the state again when the API says it was asked a moment ago, as in another tab', async () => {
      const tooSoon = () =>
        Response.json(
          { type: 'urn:problem:export_too_soon', title: 'Conflict', status: 409, code: 'export_too_soon' },
          { status: 409 }
        )
      const { api } = exportApi([{ status: 'none' }, pending], tooSoon)
      renderPage({ api })
      const section = await data()

      fireEvent.click(await section.findByRole('button', { name: 'Export data' }))

      expect(await section.findByText(/Being prepared/)).toBeInTheDocument()
    })

    it('says a request that failed, and keeps the button', async () => {
      const boom = () =>
        Response.json(
          { type: 'urn:problem:boom', title: 'Error', status: 500, code: 'internal_error' },
          { status: 500 }
        )
      renderPage({ api: exportApi([{ status: 'none' }], boom).api })
      const section = await data()

      fireEvent.click(await section.findByRole('button', { name: 'Export data' }))

      expect(await section.findByText('We could not ask for the export. Try again in a moment.')).toBeInTheDocument()
      expect(section.getByRole('button', { name: 'Export data' })).toBeEnabled()
    })

    it('says in the row when the state cannot be read, and the rest of the page stays', async () => {
      const failing = Response.json(
        { type: 'urn:problem:boom', title: 'Error', status: 500, code: 'boom' },
        { status: 500 }
      )
      renderPage({ api: exportApi([failing]).api })

      expect(await (await data()).findByText(/We could not read the last export/)).toBeInTheDocument()
      expect(details().getByText('Acme')).toBeInTheDocument()
    })
  })

  describe('the logo (ADR 0076)', () => {
    const upload = {
      uploadId: '0b8f8a3e-6a4f-4c3a-9a39-2f9f1c1d2e3f',
      url: 'https://store.example.com/files/uploads/org-1/x?X-Amz-Signature=s',
      headers: { 'Content-Type': 'image/png' },
      expiresAt: '2026-11-20T12:05:00.000Z'
    }
    const saved = { url: 'https://store.example.com/files/logos/org-1/l?X-Amz-Signature=s', width: 64, height: 64 }
    const png = new File([new Uint8Array(2048)], 'logo.png', { type: 'image/png' })
    const problem = (status: number, code: string) =>
      Response.json({ type: 'about:blank', title: code, status, code }, { status })

    /** The logo routes in memory, with the confirmation answering `confirmed`, and the export's state. */
    function logoApi(confirmed: () => Response = () => Response.json(saved)) {
      const calls: string[] = []
      const api = async (input: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET'
        calls.push(`${method} ${input}`)
        if (input.endsWith('/logo/uploads')) return Response.json(upload, { status: 201 })
        if (input.endsWith('/logo') && method === 'PUT') return confirmed()
        if (input.endsWith('/logo')) return new Response(null, { status: 204 })
        return Response.json({ status: 'none' })
      }
      return { api, calls }
    }

    const choose = (file: File) =>
      fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [file] } })

    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(null))
      )
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('shows an organization without a logo its letter, what a logo may be, and the way to upload one', () => {
      renderPage()

      expect(details().getByText(/A PNG, JPEG or WebP image up to 1 MB/)).toBeInTheDocument()
      expect(details().getByRole('button', { name: 'Upload logo' })).toBeEnabled()
      expect(details().queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    })

    it('uploads a logo straight to the store, then says it was saved', async () => {
      const { api, calls } = logoApi()
      renderPage({ api })

      choose(png)

      expect(await screen.findByText('Logo saved')).toBeInTheDocument()
      expect(refreshed).toHaveBeenCalledOnce()
      expect(globalThis.fetch).toHaveBeenCalledWith(upload.url, { method: 'PUT', headers: upload.headers, body: png })
      expect(calls.filter((call) => call.includes('/logo'))).toEqual([
        'POST /api/organizations/org-1/logo/uploads',
        'PUT /api/organizations/org-1/logo'
      ])
    })

    it('shows the logo there is, and replaces it', async () => {
      renderPage({ api: logoApi().api, logo: saved })

      expect(details().getByText('Shown beside the name in the side menu.')).toBeInTheDocument()
      expect(document.querySelector(`img[src="${saved.url}"]`)).toBeInTheDocument()
      choose(png)

      expect(await screen.findByText('Logo replaced')).toBeInTheDocument()
    })

    it('removes the logo, and says so', async () => {
      const { api, calls } = logoApi()
      renderPage({ api, logo: saved })

      fireEvent.click(details().getByRole('button', { name: 'Remove' }))

      expect(await screen.findByText('Logo removed')).toBeInTheDocument()
      expect(refreshed).toHaveBeenCalledOnce()
      expect(details().getByRole('button', { name: 'Replace' })).toHaveFocus()
      expect(calls).toContain('DELETE /api/organizations/org-1/logo')
    })

    it('says when the logo could not be removed', async () => {
      renderPage({
        api: async (input, init) =>
          init?.method === 'DELETE' ? problem(500, 'internal_error') : logoApi().api(input, init),
        logo: saved
      })

      fireEvent.click(details().getByRole('button', { name: 'Remove' }))

      expect(await screen.findByText('We could not remove the logo. Try again in a moment.')).toBeInTheDocument()
    })

    it.each([
      [
        'a file of another type, at once',
        new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }),
        undefined,
        'Use a PNG, JPEG or WebP image.'
      ],
      [
        'a file too big, with its size, at once',
        new File([new Uint8Array(2_400_000)], 'logo.png', { type: 'image/png' }),
        undefined,
        'This image is 2.4 MB. A logo can be up to 1 MB.'
      ],
      [
        'an image too small, after the API read it',
        png,
        problem(400, 'logo_dimensions'),
        'Use an image from 64 to 4096 pixels on each side.'
      ],
      [
        'an upload that did not finish',
        png,
        problem(409, 'logo_upload_missing'),
        'The upload did not finish. Check your connection, then try again.'
      ]
    ])('says what is wrong with %s', async (_case, file, refusal, message) => {
      renderPage({ api: logoApi(() => refusal as Response).api })

      choose(file)

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
    })

    it('says the organization is read only when the API refuses to sign', async () => {
      renderPage({
        api: async (input, init) =>
          input.endsWith('/uploads') ? problem(403, 'subscription_read_only') : logoApi().api(input, init)
      })

      choose(png)

      expect(await screen.findByText(/read only/i)).toBeInTheDocument()
    })

    it('waits, read only, with the reason in the row, and still lets the logo be removed', () => {
      renderPage({ readOnly: true, logo: saved })

      expect(details().getByRole('button', { name: 'Replace' })).toBeDisabled()
      expect(details().getByRole('button', { name: 'Remove' })).toBeEnabled()
    })

    it('shows a plain member the logo with no buttons', () => {
      renderPage({ permissions: builtInRoles.member, logo: saved })

      expect(details().getByText('Logo')).toBeInTheDocument()
      expect(details().queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument()
    })
  })
})
