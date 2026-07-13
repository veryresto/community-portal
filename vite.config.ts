import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 5173,
    allowedHosts: [
      "community.lvh.me",
      "community.localtest.me",
      "portal.lvh.me",
      "portal.localtest.me",
      "localhost",
      "as-macbook-pro.tailc513e0.ts.net",
      ".tailc513e0.ts.net"
    ]

  },
  plugins: [react()],
})
