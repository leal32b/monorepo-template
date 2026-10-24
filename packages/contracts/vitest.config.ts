import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: { label: 'contracts', color: 'magenta' },
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts']
  }
})
