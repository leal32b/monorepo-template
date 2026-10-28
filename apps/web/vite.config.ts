import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [UnoCSS(), solid()],
  server: {
    port: 5173,
    // In dev the browser calls /api on the web origin; Vite forwards it to the API.
    proxy: { '/api': 'http://127.0.0.1:3001' }
  }
})
