import solid from 'vite-plugin-solid'
import { defineProject } from 'vitest/config'

export default defineProject({
  // No HMR runtime in tests: its `import.meta.hot` branch never runs and would read as uncovered.
  plugins: [solid({ hot: false })],
  test: {
    name: { label: 'web', color: 'cyan' },
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts']
  }
})
