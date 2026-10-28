import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** A colour written by hand: hex, or a CSS colour function (ADR 0017). */
const literalColour = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/i

/** The app's source, tests left out (they may describe colours). */
const sourceFiles = () =>
  readdirSync(import.meta.dirname, { recursive: true, encoding: 'utf8' }).filter(
    (file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$|test-setup\.ts$/.test(file)
  )

describe('the web app', () => {
  it('takes every colour from the design system roles, never a literal value', () => {
    const literals = sourceFiles().flatMap((file) =>
      readFileSync(join(import.meta.dirname, file), 'utf8')
        .split('\n')
        .flatMap((line, index) => (literalColour.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : []))
    )

    expect(literals).toEqual([])
  })
})
