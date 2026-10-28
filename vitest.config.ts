import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*', 'apps/api/vitest.db.config.ts'],
    passWithNoTests: true,
    coverage: {
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        '**/*.port.ts',
        '**/index.ts',
        '**/test-setup.ts',
        '**/main.{ts,tsx}',
        'apps/api/src/migrate.ts'
      ],
      thresholds: { 100: true }
    }
  }
})
