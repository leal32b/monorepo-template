/** A colour as `#rrggbb`. */
export type Hex = `#${string}`

/** How bright a colour looks, from 0 (black) to 1 (white): WCAG 2.2 relative luminance. */
function luminance(hex: Hex): number {
  const channel = (start: number) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

/** WCAG 2.2 contrast ratio, from 1 (none) to 21 (black on white); the order of the colours does not matter. */
export function contrastRatio(a: Hex, b: Hex): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
