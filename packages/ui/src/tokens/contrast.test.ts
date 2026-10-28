import { contrastRatio } from './contrast'

describe('contrastRatio', () => {
  it('is 21:1 between black and white, in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21)
    expect(contrastRatio('#ffffff', '#000000')).toBe(21)
  })

  it('is 1:1 between a colour and itself', () => {
    expect(contrastRatio('#1d4ed8', '#1d4ed8')).toBe(1)
  })

  it('weighs each channel by how bright it looks (relative luminance)', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })
})
