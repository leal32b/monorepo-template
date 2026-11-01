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
  ['muted-foreground', 'secondary', 3], // the password toggle's icon on its hover background
  ['ring', 'background', 3],
  ['qr-foreground', 'qr', 4.5], // the QR code: dark on light in both themes, for every scanner
  ['foreground', 'surface', 4.5], // the side menu and other raised areas
  ['muted-foreground', 'surface', 4.5],
  ['ring', 'surface', 3],
  ['success', 'background', 4.5], // a state badge or line: "On", "All systems normal"
  ['success', 'surface', 4.5],
  ['warning', 'background', 4.5], // a state line: "Service is slow"
  ['warning', 'surface', 4.5]
]

const themes: ThemeName[] = ['light', 'dark']

describe.each(themes)('the %s theme', (theme) => {
  it.each(pairs)('puts %s on %s at %s:1 or more', (foreground, background, minimum) => {
    expect(contrastRatio(color(theme, foreground), color(theme, background))).toBeGreaterThanOrEqual(minimum)
  })
})
