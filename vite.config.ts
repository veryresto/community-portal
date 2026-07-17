import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    allowedHosts: [
      "portal.lvh.me",
      "portal.localtest.me",
      "localhost",
      "as-macbook-pro.tailc513e0.ts.net",
      ".tailc513e0.ts.net"
    ]
  },
  plugins: [react()],
})
