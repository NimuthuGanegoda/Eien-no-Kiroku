import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Eien-no-Kiroku/',
  server: {
    host: '0.0.0.0',
    // Allow Arena live-preview hostnames to reach the dev server
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
