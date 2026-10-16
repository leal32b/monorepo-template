import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Without packages: the empty suite should not fail.
    passWithNoTests: true
  }
})
