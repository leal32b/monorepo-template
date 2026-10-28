import type { Preset } from '@unocss/core'
import { presetWind4 } from '@unocss/preset-wind4'
import { color, roles, type ThemeName } from '#tokens'

/** `--ds-<role>:<colour>;` for every role of a theme. */
const variables = (theme: ThemeName) => roles.map((role) => `--ds-${role}:${color(theme, role)};`).join('')

/** The tokens and the page's base: light by default, dark when the system prefers it. */
const base = [
  `:root{color-scheme:light dark;${variables('light')}}`,
  `@media (prefers-color-scheme: dark){:root{${variables('dark')}}}`,
  'body{background-color:var(--ds-background);color:var(--ds-foreground)}'
].join('')

/**
 * The design system as a UnoCSS preset: the utility syntax the components are written with, the
 * tokens as CSS variables and a colour utility for each role (`bg-primary`, `text-muted-foreground`).
 * An app uses it in its `uno.config.ts`: `presets: [presetUi()]`.
 */
export function presetUi(): Preset {
  return {
    name: '@repo/ui',
    presets: [presetWind4()],
    theme: { colors: Object.fromEntries(roles.map((role) => [role, `var(--ds-${role})`])) },
    preflights: [{ getCSS: () => base }]
  }
}
