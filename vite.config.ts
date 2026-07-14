import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import { generate } from './scripts/generate-build-info.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Generate build-info metadata on initialization
  generate(mode)

  return {
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
  }
})
