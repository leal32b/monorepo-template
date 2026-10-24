import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Slices are cut by business capability, not by how many pages use them.
    files: ['./src/**'],
    rules: { 'fsd/insignificant-slice': 'off' }
  }
])
