import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    passWithNoTests: true,
    coverage: {
      include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.port.ts', '**/index.ts', '**/test-setup.ts', '**/main.{ts,tsx}'],
      thresholds: { 100: true }
    }
  }
})
