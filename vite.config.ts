import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DEV_API = process.env.DEV_API_URL ?? 'http://127.0.0.1:8787'

export default defineConfig({
  base: '/magic-8-ball/',
  plugins: [react()],
  server: {
    // Vite dev has no `/api/*` — forward to scripts/dev-api.mjs (npm run dev)
    proxy: {
      '/api': {
        target: DEV_API,
        changeOrigin: true,
      },
    },
  },
})