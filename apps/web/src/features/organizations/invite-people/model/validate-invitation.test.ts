import { validateInvitation } from './validate-invitation'

describe('validateInvitation', () => {
  it('cleans the spaces and the capitals of an address', () => {
    expect(validateInvitation('  Grace@Example.COM ', new Set())).toEqual({
      ok: true,
      values: { email: 'grace@example.com' }
    })
  })

  it.each([[''], ['   '], ['grace@'], ['not an address']])('refuses %j as an address', (email) => {
    expect(validateInvitation(email, new Set())).toEqual({ ok: false, problems: { email: 'emailInvalid' } })
  })

  it('refuses the address of someone already in the organization, however it is typed', () => {
    expect(validateInvitation(' Ada@Example.com ', new Set(['ada@example.com']))).toEqual({
      ok: false,
      problems: { email: 'alreadyMember' }
    })
  })
})
