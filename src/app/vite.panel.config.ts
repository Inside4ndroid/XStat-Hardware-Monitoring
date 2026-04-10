import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { renameSync, existsSync } from 'fs'

/**
 * Standalone Vite build for the read-only LAN web panel.
 * Output goes to src/XStat.Service/wwwroot/ so ASP.NET Core's
 * UseStaticFiles() serves it at http://{lan-ip}:9421/
 *
 * Build:  npm run build:panel
 * Dev:    npm run dev:panel   (hot-reload dev server at :5174)
 */

const wwwroot = resolve(__dirname, '../XStat.Service/wwwroot')

/** Vite names HTML output after the source file — rename panel.html → index.html */
function renamePanelToIndex() {
  return {
    name: 'rename-panel-to-index',
    closeBundle() {
      const src  = resolve(wwwroot, 'panel.html')
      const dest = resolve(wwwroot, 'index.html')
      if (existsSync(src)) renameSync(src, dest)
    },
  }
}

export default defineConfig({
  root: '.',
  plugins: [react(), renamePanelToIndex()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5174,
    proxy: {
      '/hubs':   { target: 'http://localhost:9421', ws: true },
      '/api':    { target: 'http://localhost:9421' },
      '/health': { target: 'http://localhost:9421' },
    },
  },
  build: {
    outDir:      wwwroot,
    emptyOutDir: true,
    rollupOptions: {
      input: { index: resolve(__dirname, 'panel.html') },
    },
  },
})
