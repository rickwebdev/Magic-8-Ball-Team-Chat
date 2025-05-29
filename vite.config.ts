import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/magic-8-ball/',
  plugins: [react()],
})