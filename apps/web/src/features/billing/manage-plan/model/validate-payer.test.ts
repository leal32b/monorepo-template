import { validatePayer } from './validate-payer'

const valid = { name: 'Barbearia do Zé', taxId: '11222333000181', email: 'ze@example.com' }

describe('validatePayer (ADR 0069)', () => {
  it('takes the payer as the API will, the document without its punctuation', () => {
    expect(validatePayer({ name: ' Ana Paula ', taxId: '529.982.247-25', email: 'Ana@Example.com' })).toEqual({
      ok: true,
      values: { name: 'Ana Paula', taxId: '52998224725', email: 'ana@example.com' }
    })
    expect(validatePayer({ ...valid, taxId: '12.abc.345/01de-35' })).toMatchObject({
      ok: true,
      values: { taxId: '12ABC34501DE35' }
    })
  })

  it.each([
    ['no name', { name: '  ' }, { name: 'nameRequired' }],
    ['a name too long', { name: 'a'.repeat(101) }, { name: 'nameTooLong' }],
    ['a document whose check digits fail', { taxId: '11.222.333/0001-82' }, { taxId: 'taxIdInvalid' }],
    ['no document', { taxId: '' }, { taxId: 'taxIdInvalid' }],
    ['an email without a domain', { email: 'ze@' }, { email: 'emailInvalid' }]
  ])('names the problem of %s', (_, change, problems) => {
    expect(validatePayer({ ...valid, ...change })).toEqual({ ok: false, problems })
  })

  it('reports every field at fault together', () => {
    expect(validatePayer({ name: '', taxId: '1', email: '' })).toEqual({
      ok: false,
      problems: { name: 'nameRequired', taxId: 'taxIdInvalid', email: 'emailInvalid' }
    })
  })
})
