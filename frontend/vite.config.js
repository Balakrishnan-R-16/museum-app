import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'https://museum-backend-eb4b.onrender.com',   // ← Spring Boot runs on Render
        changeOrigin: true,
        secure: false,
      },
      '/qr': {
        target: 'https://museum-backend-eb4b.onrender.com',   // ← static QR images served by Spring Boot
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://museum-backend-eb4b.onrender.com',   // ← uploaded museum images served by Spring Boot
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
