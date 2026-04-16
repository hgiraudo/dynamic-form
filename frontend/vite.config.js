import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 5173,
    // 👇 Permitimos acceder con el hostname público de la instancia EC2
    // o cualquier otro host. Esto evita el error "Blocked request"
    // al entrar desde fuera de localhost. En producción el frontend
    // se sirve detrás de un proxy/reverse-proxy (nginx/ELB), por lo que
    // no representa un riesgo.
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
})
