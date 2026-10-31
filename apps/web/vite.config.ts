import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [UnoCSS(), solid()],
  server: {
    // Exactly this port: the API's WEB_ORIGIN names it, and a write from any other origin is refused
    // (origin_not_allowed). With the port taken, Vite stops with an error instead of moving to 5174.
    port: 5173,
    strictPort: true,
    // In dev the browser calls /api on the web origin; Vite forwards it to the API. In production the
    // Worker sets X-Client-IP from Cloudflare (ADR 0022); here a fixed one gives the rate limit a key.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        headers: { 'X-Client-IP': '127.0.0.1' }
      }
    }
  }
})
