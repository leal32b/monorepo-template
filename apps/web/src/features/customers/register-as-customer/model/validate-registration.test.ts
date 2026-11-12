import { customerLength } from '@repo/contracts'
import { validateRegistration } from './validate-registration'

const empty = { name: '', email: '', phone: '' }

describe('validateRegistration', () => {
  it('takes a name and an email, cleaned as the API will take them', () => {
    expect(validateRegistration({ name: ' Carla ', email: ' Carla@Example.com ', phone: ' ' })).toEqual({
      ok: true,
      values: { name: 'Carla', email: 'carla@example.com' }
    })
  })

  it('takes a name and a phone alone', () => {
    expect(validateRegistration({ ...empty, name: 'Carla', phone: '+55 11 99999-0000' })).toEqual({
      ok: true,
      values: { name: 'Carla', phone: '+55 11 99999-0000' }
    })
  })

  it('asks for an email or a phone when both are empty, as a problem of the pair', () => {
    expect(validateRegistration({ ...empty, name: 'Carla' })).toEqual({
      ok: false,
      problems: { contact: 'contactRequired' }
    })
  })

  it('says an email is not one, under the email', () => {
    expect(validateRegistration({ ...empty, name: 'Carla', email: 'carla' })).toEqual({
      ok: false,
      problems: { email: 'emailInvalid' }
    })
  })

  it('asks for the name, and says one too long', () => {
    expect(validateRegistration({ ...empty, phone: '1' })).toEqual({ ok: false, problems: { name: 'nameRequired' } })
    expect(validateRegistration({ ...empty, phone: '1', name: 'a'.repeat(customerLength.name + 1) })).toEqual({
      ok: false,
      problems: { name: 'nameTooLong' }
    })
  })

  it('says a phone too long', () => {
    expect(validateRegistration({ ...empty, name: 'Carla', phone: '1'.repeat(customerLength.phone + 1) })).toEqual({
      ok: false,
      problems: { phone: 'phoneTooLong' }
    })
  })

  it('reports every problem at once', () => {
    expect(validateRegistration(empty)).toEqual({
      ok: false,
      problems: { name: 'nameRequired', contact: 'contactRequired' }
    })
  })
})
