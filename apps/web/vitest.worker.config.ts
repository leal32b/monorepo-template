import { defineProject } from 'vitest/config'

/** The web Worker runs on Cloudflare, not in a browser: Node's fetch, Request and Response stand in. */
export default defineProject({
  test: {
    name: { label: 'web-worker', color: 'white' },
    environment: 'node',
    globals: true,
    include: ['worker/**/*.test.ts'],
    unstubGlobals: true
  }
})
