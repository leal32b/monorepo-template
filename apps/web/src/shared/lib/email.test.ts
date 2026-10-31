import { cleanEmail } from './email'

describe('cleanEmail', () => {
  it('drops the spaces and capitals often pasted with an address', () => {
    expect(cleanEmail('  Ada@Example.COM ')).toBe('ada@example.com')
  })

  it('refuses what Better Auth would refuse', () => {
    expect(cleanEmail('ada@')).toBeUndefined()
    expect(cleanEmail('')).toBeUndefined()
  })
})
