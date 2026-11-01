import { readStored, store } from './device-storage'

/** What a browser with site data blocked does: touching `localStorage` throws. */
const blockStorage = () =>
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })

describe('device storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('keeps a value in this browser and reads it back', () => {
    store('theme', 'dark')

    expect(readStored('theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('forgets a value stored as undefined', () => {
    store('theme', 'dark')

    store('theme', undefined)

    expect(readStored('theme')).toBeNull()
  })

  it('reads nothing, and does not throw, when the browser blocks storage', () => {
    store('theme', 'dark')
    blockStorage()

    expect(readStored('theme')).toBeNull()
  })

  it('keeps nothing, and does not throw, when the browser blocks storage or it is full', () => {
    blockStorage()

    expect(() => store('theme', 'dark')).not.toThrow()
  })
})
