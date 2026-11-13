import type { OrganizationMembership } from '@repo/contracts'
import { render } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { membershipOf } from '../../../test-membership'
import { usePlanRefusal } from './plan-refusal'
import { plansPath } from './plans-path'

function refusalIn(): ReturnType<typeof usePlanRefusal> {
  let refusal: ReturnType<typeof usePlanRefusal> | undefined
  render(() => (
    <I18nProvider locale="en">
      {(() => {
        refusal = usePlanRefusal()
        return null
      })()}
    </I18nProvider>
  ))
  return refusal as ReturnType<typeof usePlanRefusal>
}

const onBasic = (limit: number | null): OrganizationMembership => {
  const membership = membershipOf(['owner'], {})
  return { ...membership, entitlements: { capabilities: [], limits: { 'customers.max': limit } } }
}
const failure = (code: string, limit?: number) => ({ status: 403, code, requestId: undefined, limit })

describe('usePlanRefusal (ADR 0063)', () => {
  it('leads to the plan page of the organization', () => {
    expect(plansPath('acme')).toBe('/acme/settings/billing')
  })

  it('takes the limit’s number from the refusal, else from the membership, and offers the owner the plans', () => {
    const refusal = refusalIn()
    const owner = { membership: onBasic(100), manages: true }

    expect(refusal.of(failure('plan_limit_reached', 50), 'customers.max', owner)).toEqual({
      message: 'Your plan allows 50 active customers. Choose a larger plan, or archive customers you no longer serve.',
      offerPlans: true
    })
    expect(refusal.of(failure('plan_limit_reached'), 'customers.max', owner)?.message).toMatch(/^Your plan allows 100 /)
    expect(
      refusal.of(failure('plan_limit_reached'), 'customers.max', { membership: onBasic(null), manages: true })?.message
    ).toMatch(/^Your plan allows 0 /)
  })

  it('says read only to the owner with the plans, and to another member without', () => {
    const refusal = refusalIn()

    expect(
      refusal.of(failure('subscription_read_only'), 'customers.max', { membership: onBasic(1), manages: true })
    ).toEqual({
      message: 'The organization is read only until a plan is paid. Nothing was deleted.',
      offerPlans: true
    })
    expect(
      refusal.of(failure('subscription_read_only'), 'customers.max', { membership: onBasic(1), manages: false })
    ).toEqual({
      message: 'This organization is read only until an owner pays. You can still view everything.',
      offerPlans: false
    })
  })

  it('has nothing to say of a refusal that is not the plan’s', () => {
    expect(
      refusalIn().of(failure('permission_denied'), 'customers.max', { membership: onBasic(1), manages: true })
    ).toBeUndefined()
  })
})
