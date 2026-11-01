import { readDeviceLocale } from './device-locale'

describe('readDeviceLocale', () => {
  afterEach(() => localStorage.clear())

  it('reads the language chosen on this device', () => {
    localStorage.setItem('locale', 'es')

    expect(readDeviceLocale()).toBe('es')
  })

  it('has none when nothing, or a language the app lacks, is stored', () => {
    expect(readDeviceLocale()).toBeUndefined()
    localStorage.setItem('locale', 'fr')
    expect(readDeviceLocale()).toBeUndefined()
  })
})
