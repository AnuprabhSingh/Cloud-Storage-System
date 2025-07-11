import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '::', // Listen on all IPv6 addresses
    port: 5173, // Optional: default is 5173
  },
})
