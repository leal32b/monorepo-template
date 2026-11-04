import { validateOrganization } from './validate-organization'

describe('validateOrganization', () => {
  it('accepts a name and cleans it', () => {
    expect(validateOrganization('  Acme Inc ')).toEqual({ ok: true, values: { name: 'Acme Inc' } })
  })

  it.each(['', '   '])('asks for a name when it is %j', (name) => {
    expect(validateOrganization(name)).toEqual({ ok: false, problems: { name: 'nameRequired' } })
  })

  it('asks for a shorter name above 80 characters', () => {
    expect(validateOrganization('a'.repeat(80)).ok).toBe(true)
    expect(validateOrganization('a'.repeat(81))).toEqual({ ok: false, problems: { name: 'nameTooLong' } })
  })
})
