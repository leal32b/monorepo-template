import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [UnoCSS(), solid()],
  server: {
    port: 5173,
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
