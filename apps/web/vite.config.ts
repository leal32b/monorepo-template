import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import UnoCSS from 'unocss/vite'
import { defineConfig, type Plugin, type ProxyOptions } from 'vite'
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

/**
 * The file store's origin in the CSP (ADR 0076): `STORAGE_ORIGIN` from the build's environment, an https
 * origin such as `https://<account>.r2.cloudflarestorage.com`, or nothing, where the store is the page's
 * own origin (the local store of `pnpm dev` and the end-to-end suite).
 */
function storageOrigin(): string {
  const origin = process.env.STORAGE_ORIGIN ?? ''
  if (origin !== '' && !/^https:\/\/[^/?#\s]+$/.test(origin)) {
    throw new Error('STORAGE_ORIGIN must be https://host, with no path and no trailing slash')
  }
  return origin
}

/** `_headers` with its `$STORAGE_ORIGIN` token replaced by the store's origin, or dropped. */
const withStorageOrigin = (headers: string) =>
  headers.replaceAll(' $STORAGE_ORIGIN', storageOrigin() === '' ? '' : ` ${storageOrigin()}`)

/** Writes the store's origin into the `_headers` the build publishes, which `public/` copies as it is. */
const storageOriginInHeaders: Plugin = {
  name: 'storage-origin-in-headers',
  apply: 'build',
  writeBundle(options) {
    const file = path.join(options.dir as string, '_headers')
    writeFileSync(file, withStorageOrigin(readFileSync(file, 'utf8')))
  }
}

/** The headers `public/_headers` gives every path (`/*`), so `vite preview` serves the production CSP. */
function headersForEveryPath(): Record<string, string> {
  const file = withStorageOrigin(readFileSync(new URL('public/_headers', import.meta.url), 'utf8'))
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
  plugins: [UnoCSS(fileURLToPath(new URL('uno.config.ts', import.meta.url))), solid(), storageOriginInHeaders],
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
