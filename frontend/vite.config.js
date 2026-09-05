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
        target: 'http://localhost:8080',   // ← Spring Boot runs on 8080
        changeOrigin: true,
        secure: false,
      },
      '/qr': {
        target: 'http://localhost:8080',   // ← static QR images served by Spring Boot
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:8080',   // ← uploaded museum images served by Spring Boot
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
