import solid from 'vite-plugin-solid'
import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [solid()],
  test: {
    name: 'web',
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts']
  }
})
