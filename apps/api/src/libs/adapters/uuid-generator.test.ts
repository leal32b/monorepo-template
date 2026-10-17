import { UuidGenerator } from './uuid-generator'

describe('UuidGenerator', () => {
  it('generates RFC 4122 UUIDs', () => {
    expect(new UuidGenerator().generate()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('generates a different id each time', () => {
    const generator = new UuidGenerator()

    expect(generator.generate()).not.toBe(generator.generate())
  })
})
