import { customerLength } from '@repo/contracts'
import { validateCustomer } from './validate-customer'

const empty = { name: '', email: '', phone: '', company: '', notes: '' }

describe('validateCustomer', () => {
  it('takes a name alone, and sends what the contract will accept', () => {
    expect(validateCustomer({ ...empty, name: '  Ada ' })).toEqual({ ok: true, values: { name: 'Ada' } })
  })

  it('cleans the email and sends a blank optional field as none', () => {
    const checked = validateCustomer({ ...empty, name: 'Ada', email: ' Ada@Example.com ', phone: ' ', notes: 'Hi' })

    expect(checked).toEqual({ ok: true, values: { name: 'Ada', email: 'ada@example.com', notes: 'Hi' } })
  })

  it('asks for the name', () => {
    expect(validateCustomer(empty)).toEqual({ ok: false, problems: { name: 'nameRequired' } })
    expect(validateCustomer({ ...empty, name: '   ' })).toEqual({ ok: false, problems: { name: 'nameRequired' } })
  })

  it('says a name is too long', () => {
    const name = 'a'.repeat(customerLength.name + 1)

    expect(validateCustomer({ ...empty, name })).toEqual({ ok: false, problems: { name: 'nameTooLong' } })
  })

  it('says an email is not one', () => {
    expect(validateCustomer({ ...empty, name: 'Ada', email: 'ada' })).toEqual({
      ok: false,
      problems: { email: 'emailInvalid' }
    })
  })

  it.each(['phone', 'company', 'notes'] as const)('says a %s is too long', (field) => {
    const input = { ...empty, name: 'Ada', [field]: 'a'.repeat(customerLength[field] + 1) }

    expect(validateCustomer(input)).toEqual({ ok: false, problems: { [field]: `${field}TooLong` } })
  })

  it('reports every field at fault at once', () => {
    expect(validateCustomer({ ...empty, email: 'x' })).toEqual({
      ok: false,
      problems: { name: 'nameRequired', email: 'emailInvalid' }
    })
  })
})
