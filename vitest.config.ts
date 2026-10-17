import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    passWithNoTests: true,
    coverage: {
      include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.port.ts', 'apps/*/src/main.{ts,tsx}', '**/test-setup.ts'],
      thresholds: { 100: true }
    }
  }
})
