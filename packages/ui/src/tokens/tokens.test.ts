import { contrastRatio } from './contrast'
import { color, type Role, type ThemeName } from './tokens'

/**
 * Every pair of roles the components draw one on top of the other, with its WCAG 2.2 minimum:
 * 4.5:1 for text (1.4.3), 3:1 for control outlines and the focus ring (1.4.11).
 */
const pairs: [foreground: Role, background: Role, minimum: number][] = [
  ['foreground', 'background', 4.5],
  ['muted-foreground', 'background', 4.5],
  ['destructive', 'background', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['secondary-foreground', 'secondary', 4.5],
  ['destructive-foreground', 'destructive', 4.5],
  ['border', 'background', 3],
  ['ring', 'background', 3]
]

const themes: ThemeName[] = ['light', 'dark']

describe.each(themes)('the %s theme', (theme) => {
  it.each(pairs)('puts %s on %s at %s:1 or more', (foreground, background, minimum) => {
    expect(contrastRatio(color(theme, foreground), color(theme, background))).toBeGreaterThanOrEqual(minimum)
  })
})
