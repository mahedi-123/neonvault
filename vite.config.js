import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API = process.env.API_URL || 'http://127.0.0.1:8787'

/** In dev, /admin (and deep links under it) serve the admin app like production does. */
const adminRoute = () => ({
  name: 'nv-admin-route',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url.startsWith('/admin/') || req.url.startsWith('/admin?')) req.url = '/admin.html'
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  // relative base for static previews that are not served from the domain root
  base: process.env.VITE_BASE || '/',
  plugins: [react(), adminRoute()],
  server: {
    proxy: { '/api': { target: API, changeOrigin: false } },
  },
  preview: {
    proxy: { '/api': { target: API, changeOrigin: false } },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...(process.env.VITE_HASH_ROUTER ? {} : { admin: resolve(import.meta.dirname, 'admin.html') }),
      },
    },
  },
})
