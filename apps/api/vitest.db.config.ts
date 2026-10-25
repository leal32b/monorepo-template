import { defineProject } from 'vitest/config'

/** Adapter tests against real Postgres: PGlite over TCP, one file at a time (ADR 0013). */
export default defineProject({
  test: {
    name: { label: 'api-db', color: 'yellow' },
    environment: 'node',
    globals: true,
    include: ['src/**/*.db.test.ts'],
    globalSetup: ['./test/postgres.global-setup.ts'],
    fileParallelism: false
  }
})
