import type { Preset } from '@unocss/core'
import { presetWind4 } from '@unocss/preset-wind4'

/**
 * The design system as a UnoCSS preset: the utility syntax the components are written with.
 * An app uses it in its `uno.config.ts`: `presets: [presetUi()]`.
 */
export function presetUi(): Preset {
  return {
    name: '@repo/ui',
    presets: [presetWind4()]
  }
}
