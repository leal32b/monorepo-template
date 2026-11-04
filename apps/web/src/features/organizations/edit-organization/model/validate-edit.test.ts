import { validateAddress, validateName } from './validate-edit'

describe('validateName', () => {
  it('cleans the spaces around a name', () => {
    expect(validateName('  Acme Inc ')).toEqual({ ok: true, values: { name: 'Acme Inc' } })
  })

  it.each([
    ['empty', '', 'nameRequired'],
    ['blank', '   ', 'nameRequired'],
    ['too long', 'a'.repeat(81), 'nameTooLong']
  ] as const)('refuses a name that is %s', (_case, name, problem) => {
    expect(validateName(name)).toEqual({ ok: false, problems: { name: problem } })
  })
})

describe('validateAddress', () => {
  it('cleans the spaces and the capitals of an address', () => {
    expect(validateAddress('  Acme-Inc ')).toEqual({ ok: true, values: { slug: 'acme-inc' } })
  })

  it.each([
    ['empty', '', 'slugRequired'],
    ['blank', '   ', 'slugRequired'],
    ['a reserved word', 'settings', 'slugReserved'],
    ['a space inside', 'acme inc', 'slugInvalid'],
    ['an accent', 'café', 'slugInvalid'],
    ['a double hyphen', 'acme--inc', 'slugInvalid'],
    ['too long', 'a'.repeat(49), 'slugInvalid']
  ] as const)('refuses an address that is %s', (_case, address, problem) => {
    expect(validateAddress(address)).toEqual({ ok: false, problems: { slug: problem } })
  })

  it('refuses an address the API said someone has, however it is typed', () => {
    expect(validateAddress('Globex', new Set(['globex']))).toEqual({ ok: false, problems: { slug: 'slugTaken' } })
  })
})
