import {
  type AuditEntry,
  auditPageSize,
  builtInRoles,
  type OrganizationMembership,
  type Permissions
} from '@repo/contracts'
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library'
import type { Locale } from '#shared/config'
import { membershipOf } from '../../../test-membership'
import { renderOrganizationPage } from '../../../test-organization-page'
import { OrganizationActivityPage } from './organization-activity-page'

const _acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }

const entry = (id: string, over: Partial<AuditEntry> = {}): AuditEntry => ({
  id,
  at: '2026-11-07T10:00:00.000Z',
  actor: { kind: 'member', id: 'user-ada', name: 'Ada Lovelace' },
  resource: { type: 'customer', id: 'c1' },
  action: 'updated',
  fields: ['name', 'email'],
  ...over
})

/** The API's trail in memory: newest first, `auditPageSize` a page, the cursor being the last id shown. */
function fakeApi(entries: AuditEntry[], { fail = false } = {}) {
  const calls: string[] = []
  const fetch = async (input: string) => {
    const url = new URL(input, 'http://localhost')
    calls.push(url.pathname + url.search)
    if (fail)
      return Response.json({ type: 'urn:problem:boom', title: 'boom', status: 500, code: 'boom' }, { status: 500 })
    const before = url.searchParams.get('before')
    const from = before === null ? 0 : entries.findIndex((candidate) => candidate.id === before) + 1
    const items = entries.slice(from, from + auditPageSize)
    const more = from + auditPageSize < entries.length
    return Response.json({ items, next: more ? (items.at(-1) as AuditEntry).id : null })
  }
  return { fetch, calls }
}

function renderPage({
  held = builtInRoles.owner as Permissions,
  locale = 'en',
  api,
  capabilities
}: {
  held?: Permissions
  locale?: Locale
  api: ReturnType<typeof fakeApi>
  /** What the plan grants, when the test is about it: the trial's otherwise. */
  capabilities?: OrganizationMembership['entitlements']['capabilities']
}) {
  const base = membershipOf(['owner'], held as OrganizationMembership['permissions'])
  const membership =
    capabilities === undefined ? base : { ...base, entitlements: { ...base.entitlements, capabilities } }
  return renderOrganizationPage({
    page: OrganizationActivityPage,
    path: '/settings/activity',
    api: api.fetch,
    locale,
    membership
  })
}

const section = async () => within(await screen.findByRole('region', { name: 'Recent changes' }))

describe('OrganizationActivityPage (ADR 0061)', () => {
  it('lists who did what, and when, in the organization’s time zone, newest first', async () => {
    const api = fakeApi([
      entry('e3', { at: '2026-11-07T12:30:00.000Z', action: 'deleted', fields: [] }),
      entry('e2', { actor: { kind: 'visitor' }, action: 'created', fields: ['name', 'phone'] }),
      entry('e1')
    ])
    renderPage({ api })

    expect(await screen.findByRole('heading', { level: 1, name: 'Activity' })).toBeInTheDocument()
    const rows = await section()
    expect(rows.getAllByText('Ada Lovelace')).toHaveLength(2)
    expect(rows.getByText('Deleted a customer · Nov 7, 2026, 12:30 PM UTC')).toBeInTheDocument()
    expect(rows.getByText('A visitor, through your public page')).toBeInTheDocument()
    expect(rows.getByText('Added a customer: name, phone · Nov 7, 2026, 10:00 AM UTC')).toBeInTheDocument()
    expect(rows.getByText('Edited a customer: name, email · Nov 7, 2026, 10:00 AM UTC')).toBeInTheDocument()
    expect(screen.getByText('Who changed what in Acme, newest first. Kept for a year.')).toBeInTheDocument()
    expect(api.calls).toEqual(['/api/organizations/org-1/audit-entries'])
  })

  it('names a member who left, and the system, by what they are', async () => {
    renderPage({
      api: fakeApi([
        entry('e2', { actor: { kind: 'member', id: 'user-gone', name: null } }),
        entry('e1', { actor: { kind: 'system' }, action: 'archived', fields: [] })
      ])
    })

    const rows = await section()
    expect(rows.getByText('A former member')).toBeInTheDocument()
    expect(rows.getByText('The system')).toBeInTheDocument()
  })

  it('names an operator who entered and left, and one whose account is gone (ADR 0077)', async () => {
    const visit = { resource: { type: 'organization' as const, id: 'org-1' }, fields: [] }
    renderPage({
      api: fakeApi([
        entry('e2', {
          ...visit,
          actor: { kind: 'operator', id: 'user-otto', name: 'Otto' },
          action: 'impersonation-ended'
        }),
        entry('e1', {
          ...visit,
          actor: { kind: 'operator', id: 'user-gone', name: null },
          action: 'impersonation-started'
        })
      ])
    })

    const rows = await section()
    expect(rows.getByText('Otto, an operator of the service')).toBeInTheDocument()
    expect(rows.getByText('An operator of the service')).toBeInTheDocument()
    expect(rows.getByText('Left the organization · Nov 7, 2026, 10:00 AM UTC')).toBeInTheDocument()
    expect(
      rows.getByText('Entered to see the organization as its owner, read only · Nov 7, 2026, 10:00 AM UTC')
    ).toBeInTheDocument()
  })

  it('shows a field it has no word for by its code', async () => {
    renderPage({ api: fakeApi([entry('e1', { fields: ['nickname'] })]) })

    expect(await screen.findByText('Edited a customer: nickname · Nov 7, 2026, 10:00 AM UTC')).toBeInTheDocument()
  })

  it("says what a provider's notice changed in the subscription, by the system (ADR 0063)", async () => {
    renderPage({
      api: fakeApi([
        entry('e1', {
          actor: { kind: 'system' },
          resource: { type: 'subscription', id: 'org-1' },
          action: 'payment-recovered',
          fields: ['status', 'pastDueSince', 'paidThrough']
        })
      ])
    })

    expect(
      await screen.findByText('Received the late payment: status, late since, paid until · Nov 7, 2026, 10:00 AM UTC')
    ).toBeInTheDocument()
  })

  it('says nothing has changed yet, and draws no pager', async () => {
    renderPage({ api: fakeApi([]) })

    expect(await screen.findByText('Nothing has changed yet')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Activity pages' })).not.toBeInTheDocument()
  })

  it('moves to older entries and back, with the newest end disabled', async () => {
    const entries = Array.from({ length: auditPageSize + 2 }, (_, n) => entry(`e${n}`))
    const api = fakeApi(entries)
    renderPage({ api })

    const pager = within(await screen.findByRole('navigation', { name: 'Activity pages' }))
    expect(pager.getByRole('status')).toHaveTextContent('Page 1')
    expect(pager.getByRole('button', { name: 'Newer' })).toBeDisabled()

    fireEvent.click(pager.getByRole('button', { name: 'Older' }))

    expect(await pager.findByText('Page 2')).toBeInTheDocument()
    expect(api.calls.at(-1)).toBe(`/api/organizations/org-1/audit-entries?before=e${auditPageSize - 1}`)
    await waitFor(() => expect(pager.getByRole('button', { name: 'Older' })).toBeDisabled())
    // The second page holds the two entries the first could not.
    await waitFor(() => expect(screen.getAllByText('Ada Lovelace')).toHaveLength(2))

    fireEvent.click(pager.getByRole('button', { name: 'Newer' }))

    const summary = () => within(screen.getByRole('navigation', { name: 'Activity pages' })).getByRole('status')
    await waitFor(() => expect(summary()).toHaveTextContent('Page 1'))
    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(auditPageSize)
  })

  it('says a role without the activity cannot see it, and asks the API for nothing', () => {
    const api = fakeApi([entry('e1')])
    renderPage({ held: builtInRoles.member as Permissions, api })

    expect(screen.getByText('You cannot see the activity here')).toBeInTheDocument()
    expect(screen.getByText('Your role in Acme does not include it. Ask an owner or an admin.')).toBeInTheDocument()
    expect(api.calls).toEqual([])
  })

  it('says what could not be read and offers to try again', async () => {
    renderPage({ api: fakeApi([], { fail: true }) })

    expect(await screen.findByText(/We could not load the activity/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('speaks Portuguese', async () => {
    renderPage({ locale: 'pt-BR', api: fakeApi([entry('e1', { actor: { kind: 'member', id: 'x', name: null } })]) })

    expect(await screen.findByRole('heading', { level: 1, name: 'Atividade' })).toBeInTheDocument()
    expect(await screen.findByText('Alguém que não é mais membro')).toBeInTheDocument()
    expect(screen.getByText(/^Editou um cliente: nome, e-mail · /)).toBeInTheDocument()
  })

  describe('on a plan without the activity log (ADR 0063)', () => {
    it('tells the owner it comes with a larger plan, with the way to the plans, and reads nothing', async () => {
      const api = fakeApi([entry('e1')])
      renderPage({ api, capabilities: [] })

      expect(await screen.findByText('The activity log is not in your plan')).toBeInTheDocument()
      expect(
        screen.getByText(
          'It comes with Pro. Activity is recorded on every plan and shows here once the plan includes it.'
        )
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/acme/settings/billing')
      expect(api.calls).toEqual([])
    })

    it('tells another member that an owner can change the plan', async () => {
      renderPage({ api: fakeApi([]), held: builtInRoles.admin as Permissions, capabilities: [] })

      expect(
        await screen.findByText(
          'It comes with Pro. Activity is recorded on every plan and shows here once the plan includes it. An owner can change the plan.'
        )
      ).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'See plans' })).not.toBeInTheDocument()
    })
  })
})
