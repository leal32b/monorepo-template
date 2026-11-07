import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { API_PORT, DB_PORT, WEB_ORIGIN, WEB_PORT } from './support/env'

/**
 * The production build of the web app (`vite preview`, with the production CSP) on the API's
 * end-to-end entry and an in-memory Postgres, fresh on every run (ADR 0045). No outside service:
 * emails go to a file the tests read, the breached-password check answers offline.
 */
const repo = path.resolve(import.meta.dirname, '../..')
// Set once by the runner process; its workers inherit it.
process.env.E2E_OUTBOX ??= path.join(mkdtempSync(path.join(tmpdir(), 'e2e-')), 'outbox.jsonl')

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // A flaky test is a bug to fix, not to retry (ADR 0045).
  retries: 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: WEB_ORIGIN,
    locale: 'en-US',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'setup', testMatch: /\.setup\.ts$/ },
    { name: 'e2e', dependencies: ['setup'] }
  ],
  webServer: [
    {
      name: 'api',
      cwd: path.join(repo, 'apps/api'),
      // PGlite runs the API once it listens, with DATABASE_URL pointing at itself.
      command: `pnpm exec pglite-server --port=${DB_PORT} --max-connections=10 --include-database-url --run "pnpm run e2e"`,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      // Never a server already running: it could be the dev API on real data.
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        WEB_ORIGIN,
        BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        E2E_OUTBOX: process.env.E2E_OUTBOX,
        LOG_LEVEL: 'warn'
      }
    },
    {
      name: 'web',
      cwd: path.join(repo, 'apps/web'),
      // What users get: the production build, code split and minified.
      command: `pnpm exec vite build --logLevel warn && pnpm exec vite preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: WEB_ORIGIN,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` }
    }
  ]
})
