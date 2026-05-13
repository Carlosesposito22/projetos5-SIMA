import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // Polling é necessário pra HMR detectar mudanças quando o código está
    // num volume montado a partir do host (Windows/macOS via Docker Desktop).
    watch: {
      usePolling: true,
    },
  },
})
