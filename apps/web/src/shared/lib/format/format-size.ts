const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

/** A file's size in the user's language, in the largest unit that keeps it at 1 or more: "2.4 MB", "512 bytes". */
export function formatSize(bytes: number, locale: string): string {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: unit === 0 ? 'long' : 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1
  }).format(value)
}
