import { presetUi } from '@repo/ui/preset'
import { defineConfig } from 'unocss'

export default defineConfig({
  presets: [presetUi()],
  // The design system keeps classes in .ts files too (variants); UnoCSS scans only .tsx by default.
  content: { pipeline: { include: [/\.[jt]sx?($|\?)/] } }
})
