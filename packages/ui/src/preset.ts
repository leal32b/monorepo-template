import type { Preset } from '@unocss/core'
import { presetWind4 } from '@unocss/preset-wind4'
import { color, roles, type ThemeName } from '#tokens'

/** `--ds-<role>:<colour>;` for every role of a theme. */
const variables = (theme: ThemeName) => roles.map((role) => `--ds-${role}:${color(theme, role)};`).join('')

/**
 * The tokens and the page's base: light by default, dark when the system prefers it, and a theme
 * chosen on the device (`data-theme` on <html>) over the system's (ADR 0028). The scrollbar gutter
 * stays reserved, so a page that scrolls and one that does not line up.
 */
const base = [
  'html{scrollbar-gutter:stable}',
  `:root{color-scheme:light dark;${variables('light')}}`,
  ':root[data-theme=light]{color-scheme:light}',
  `:root[data-theme=dark]{color-scheme:dark;${variables('dark')}}`,
  `@media (prefers-color-scheme: dark){:root:not([data-theme=light]){${variables('dark')}}}`,
  'body{background-color:var(--ds-background);color:var(--ds-foreground)}'
].join('')

/** One colour per role, read from its variable; `transparent`, `current` and `inherit` are keywords Wind4 keeps. */
const colors = Object.fromEntries(roles.map((role) => [role, `var(--ds-${role})`]))

/**
 * The design system as a UnoCSS preset: the utility syntax the components are written with, the
 * tokens as CSS variables and a colour utility for each role (`bg-primary`, `text-muted-foreground`)
 * in place of Wind4's palette, so a colour that is not a role paints nothing.
 * An app uses it in its `uno.config.ts`: `presets: [presetUi()]` (ADR 0016).
 */
export function presetUi(): Preset {
  return {
    name: '@repo/ui',
    presets: [presetWind4()],
    extendTheme: (theme) => ({ ...theme, colors }),
    preflights: [{ getCSS: () => base }]
  }
}
