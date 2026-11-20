import { fireEvent, screen } from '@solidjs/testing-library'
import { rememberImpersonation } from '#entities/impersonations'
import { type Fetch, problem, renderBackOffice, visitToAcme } from '../../../test-back-office'
import { ImpersonationBanner } from './impersonation-banner'

const inAnHour = () => ({ ...visitToAcme, endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() })

function renderBanner(api: Fetch, locale: 'en' | 'pt-BR' = 'en') {
  rememberImpersonation()
  return renderBackOffice({ at: '/acme', routes: [{ path: '/acme', component: ImpersonationBanner }], api, locale })
}

describe('ImpersonationBanner (ADR 0077)', () => {
  afterEach(() => window.localStorage.clear())

  it('says whose organization the operator sees, read only, until when', async () => {
    const visit = inAnHour()
    renderBanner(async () => Response.json({ impersonation: visit }))

    expect(await screen.findByText('You are viewing Acme as its owner sees it')).toBeInTheDocument()
    expect(screen.getByText(/Read only: nothing you do here changes it. Your visit ends on/)).toBeInTheDocument()
  })

  it('draws nothing without a visit', async () => {
    renderBackOffice({
      at: '/acme',
      routes: [{ path: '/acme', component: () => <ImpersonationBanner /> }],
      api: async () => Response.json({ impersonation: null })
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it("leaves, and goes back to the organization's page in the back office", async () => {
    const visit = inAnHour()
    const api = vi.fn<Fetch>(async (_path, init) =>
      init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ impersonation: visit })
    )
    renderBanner(api)

    fireEvent.click(await screen.findByRole('button', { name: 'Leave' }))

    expect(await screen.findByText('Elsewhere: /admin/organizations/org-1')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/api/admin/impersonation', expect.objectContaining({ method: 'DELETE' }))
    expect(window.localStorage.getItem('impersonation')).toBeNull()
  })

  it('says when leaving failed, and stays', async () => {
    const visit = inAnHour()
    renderBanner(async (_path, init) =>
      init?.method === 'DELETE' ? problem(503, 'service_unavailable') : Response.json({ impersonation: visit })
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Leave' }))

    expect(await screen.findByText('Could not leave. Check your connection and try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave' })).toBeEnabled()
  })

  it('ends the visit at its time, as when the operator leaves', async () => {
    renderBanner(async () =>
      Response.json({ impersonation: { ...visitToAcme, endsAt: new Date(Date.now() + 50).toISOString() } })
    )

    expect(await screen.findByText('Elsewhere: /admin/organizations/org-1')).toBeInTheDocument()
  })

  it('speaks Portuguese', async () => {
    renderBanner(async () => Response.json({ impersonation: inAnHour() }), 'pt-BR')

    expect(await screen.findByText('Você está vendo Acme como o dono vê')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })
})
