import { validateDeletion } from './validate-deletion'

describe('validateDeletion', () => {
  it('accepts the name as it is, ignoring spaces around what was typed', () => {
    expect(validateDeletion(' Acme Inc ', 'Acme Inc')).toEqual({ ok: true, values: {} })
  })

  it.each([
    ['nothing', ''],
    ['another case', 'acme inc'],
    ['part of it', 'Acme'],
    ['another name', 'Globex']
  ])('refuses %s', (_case, typed) => {
    expect(validateDeletion(typed, 'Acme Inc')).toEqual({ ok: false, problems: { confirm: 'mismatch' } })
  })
})
