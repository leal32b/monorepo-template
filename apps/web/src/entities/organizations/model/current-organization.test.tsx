import { render, screen } from '@solidjs/testing-library'
import { membershipOf } from '../../../test-membership'
import { CurrentOrganizationProvider, homeOf, useCurrentOrganization, useOrganization } from './current-organization'

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }

function Rights() {
  const { organization, membership, can } = useOrganization()
  return (
    <p>
      {organization.name} as {membership.roles.join(', ')}: invite {String(can('invitation', 'create'))}, delete{' '}
      {String(can('organization', 'delete'))}
    </p>
  )
}

describe('CurrentOrganizationProvider', () => {
  it('gives the screens the organization and what the caller may do, as the API resolved it', () => {
    const membership = membershipOf(['recruiter'], { invitation: ['create'] })

    render(() => (
      <CurrentOrganizationProvider organization={acme} membership={membership}>
        <Rights />
      </CurrentOrganizationProvider>
    ))

    expect(screen.getByText('Acme as recruiter: invite true, delete false')).toBeInTheDocument()
  })

  it('hands a screen the way to read what the caller may do again', () => {
    const refresh = vi.fn(async () => undefined)
    function Again() {
      const current = useOrganization()
      return (
        <button type="button" onClick={() => void current.refresh()}>
          Read again
        </button>
      )
    }

    render(() => (
      <CurrentOrganizationProvider organization={acme} membership={membershipOf([], {})} refresh={refresh}>
        <Again />
      </CurrentOrganizationProvider>
    ))
    screen.getByRole('button', { name: 'Read again' }).click()

    expect(refresh).toHaveBeenCalledOnce()
  })

  it('reads nothing again where nothing put up a way to (a screen drawn on its own)', async () => {
    let current: ReturnType<typeof useOrganization> | undefined
    render(() => (
      <CurrentOrganizationProvider organization={acme} membership={membershipOf([], {})}>
        {(() => {
          current = useOrganization()
          return null
        })()}
      </CurrentOrganizationProvider>
    ))

    await expect(current?.refresh()).resolves.toBeUndefined()
  })

  it('is only for tenant screens', () => {
    expect(() => render(() => <Rights />)).toThrow('useOrganization must be used inside a CurrentOrganizationProvider')
  })

  it('tells a screen outside any organization that there is none', () => {
    function Where() {
      return <p>{useCurrentOrganization() === undefined ? 'no organization' : 'an organization'}</p>
    }

    render(() => <Where />)

    expect(screen.getByText('no organization')).toBeInTheDocument()
  })
})

describe('homeOf', () => {
  it('is the organization’s slug, or the root outside any organization', () => {
    expect(homeOf(acme)).toBe('/acme')
    expect(homeOf(undefined)).toBe('/')
  })
})
