import { createGenerator } from '@unocss/core'
import { color, roles } from '#tokens'
import { presetUi } from './preset'

/** The CSS the preset generates for these classes, with or without its base styles (preflights). */
async function generate(classes: string, { preflights = false } = {}): Promise<string> {
  const uno = await createGenerator({ presets: [presetUi()] })
  const { css } = await uno.generate(classes, { preflights })
  return css
}

describe('presetUi', () => {
  it('generates the utilities the components are written with', async () => {
    expect(await generate('px-3')).toContain('.px-3{padding-inline:calc(var(--spacing) * 3);}')
  })

  it('declares every role as a CSS variable: light by default, dark when the system prefers it', async () => {
    const [light, dark] = (await generate('', { preflights: true })).split('@media (prefers-color-scheme: dark)')

    for (const role of roles) {
      expect(light).toContain(`--ds-${role}:${color('light', role)};`)
      expect(dark).toContain(`--ds-${role}:${color('dark', role)};`)
    }
  })

  it('paints the page with the background and foreground roles', async () => {
    expect(await generate('', { preflights: true })).toContain(
      'body{background-color:var(--ds-background);color:var(--ds-foreground)}'
    )
  })

  it('turns every role into a colour utility that reads its variable', async () => {
    const css = await generate(roles.map((role) => `text-${role}`).join(' '))

    for (const role of roles) {
      expect(css).toMatch(new RegExp(`\\.text-${role}\\{[^}]*var\\(--ds-${role}\\)`))
    }
  })
})
