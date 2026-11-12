import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import UnoCSS from 'unocss/vite'
import { defineConfig, type ProxyOptions } from 'vite'
import solid from 'vite-plugin-solid'

/**
 * In dev and preview the browser calls /api on the web origin; Vite forwards it to the API. In
 * production the Worker sets X-Client-IP from Cloudflare (ADR 0022); here the client's own header is
 * kept (the end-to-end suite gives each test its own, ADR 0045), else a fixed one gives the rate
 * limit a key.
 */
const api: ProxyOptions = {
  target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001',
  configure: (proxy) => {
    proxy.on('proxyReq', (request, incoming) => {
      if (!incoming.headers['x-client-ip']) request.setHeader('X-Client-IP', '127.0.0.1')
    })
  }
}

/** The headers `public/_headers` gives every path (`/*`), so `vite preview` serves the production CSP. */
function headersForEveryPath(): Record<string, string> {
  const file = readFileSync(new URL('public/_headers', import.meta.url), 'utf8')
  const block = /(?:^|\n)\/\*\n([\s\S]*?)(?:\n\n|\n?$)/.exec(file)?.[1] ?? ''
  return Object.fromEntries(
    block
      .split('\n')
      .map((line) => line.trim().split(/:\s(.*)/s))
      .filter(([name, value]) => name && value)
      .map(([name, value]) => [name as string, value as string])
  )
}

export default defineConfig({
  // The config by its path: UnoCSS looks in the working directory, which is the repository root when
  // a tool such as knip loads this file from there.
  plugins: [UnoCSS(fileURLToPath(new URL('uno.config.ts', import.meta.url))), solid()],
  server: {
    // Exactly this port: the API's WEB_ORIGIN names it, and a write from any other origin is refused
    // (origin_not_allowed). With the port taken, Vite stops with an error instead of moving to 5174.
    port: 5173,
    strictPort: true,
    proxy: { '/api': api }
  },
  build: {
    // What the entry imports statically, the first download, is one file (ADR 0060). Left to itself,
    // Rolldown cuts every module the entry shares with a lazy screen into a common chunk of its own, and
    // a cold load fetches a dozen small files, each a request and a gzip header more.
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'index', tags: ['$initial'] }] } }
    }
  },
  preview: {
    proxy: { '/api': api },
    headers: headersForEveryPath()
  }
})
