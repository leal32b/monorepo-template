import { formatSize } from './format-size'

describe('formatSize', () => {
  it.each([
    [512, 'en', '512 bytes'],
    [2_048, 'en', '2 kB'],
    [2_400_000, 'en', '2.4 MB'],
    [2_400_000, 'pt-BR', '2,4 MB'],
    [3_000_000_000_000, 'en', '3,000 GB']
  ])('writes %i bytes in %s as %s', (bytes, locale, written) => {
    expect(formatSize(bytes, locale)).toBe(written)
  })
})
