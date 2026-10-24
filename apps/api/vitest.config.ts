import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: { label: 'api', color: 'green' },
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts']
  }
})
