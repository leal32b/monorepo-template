import { render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { visitToAcme } from '../../../test-back-office'
import { ImpersonationProvider, useImpersonation } from './impersonation'
import { forgetImpersonation, hasImpersonation, rememberImpersonation } from './impersonation-hint'

function Shown() {
  const { current, set } = useImpersonation()
  return (
    <>
      <p>Visit: {current() === undefined ? 'asking' : (current()?.organization.name ?? 'none')}</p>
      <button type="button" onClick={() => set(visitToAcme)}>
        Start
      </button>
      <button type="button" onClick={() => set(null)}>
        End
      </button>
    </>
  )
}

function renderWith(fetch: (path: string) => Promise<Response>) {
  render(() => (
    <ApiProvider client={createApiClient({ fetch })}>
      <ImpersonationProvider>
        <Shown />
      </ImpersonationProvider>
    </ApiProvider>
  ))
}

describe("the operator's visit (ADR 0077)", () => {
  afterEach(() => window.localStorage.clear())

  it('asks the back office nothing on a device that started no visit', async () => {
    const fetch = vi.fn(async () => Response.json({ impersonation: null }))
    renderWith(fetch)

    expect(await screen.findByText('Visit: none')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks where a visit was started, and keeps the hint while it lasts', async () => {
    rememberImpersonation()
    renderWith(async () => Response.json({ impersonation: visitToAcme }))

    expect(await screen.findByText('Visit: Acme')).toBeInTheDocument()
    expect(hasImpersonation()).toBe(true)
  })

  it('forgets the hint when no visit is on, or the back office refuses (not an operator)', async () => {
    rememberImpersonation()
    renderWith(async () => Response.json({ code: 'not_found' }, { status: 404 }))

    expect(await screen.findByText('Visit: none')).toBeInTheDocument()
    expect(hasImpersonation()).toBe(false)
  })

  it('keeps a visit started or ended on this device', async () => {
    renderWith(async () => Response.json({ impersonation: null }))
    await screen.findByText('Visit: none')

    screen.getByRole('button', { name: 'Start' }).click()
    await waitFor(() => expect(screen.getByText('Visit: Acme')).toBeInTheDocument())
    expect(hasImpersonation()).toBe(true)
    screen.getByRole('button', { name: 'End' }).click()
    await waitFor(() => expect(screen.getByText('Visit: none')).toBeInTheDocument())
    expect(hasImpersonation()).toBe(false)
  })

  it('has no visit outside the provider', () => {
    render(() => <Shown />)

    expect(screen.getByText('Visit: none')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Start' }).click()
    forgetImpersonation()
  })
})
