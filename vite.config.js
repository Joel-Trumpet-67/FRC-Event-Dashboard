import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Battery-Life/', // GitHub Pages subdirectory
  server: {
    host: true, // expose on LAN so phones can connect
    port: 5173
  }
})
