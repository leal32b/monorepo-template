import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'contracts',
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts']
  }
})
