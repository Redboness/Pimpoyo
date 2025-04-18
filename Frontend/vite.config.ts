import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['pimpoyo.com', '*'],
    proxy: {
      // Requests starting with /api will be forwarded to your backend
      '/api': {
        target: 'http://localhost:8000', // Your FastAPI server address (localhost is fine here)
        changeOrigin: true, // Recommended for most setups
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix before sending to backend
      },
    },
  },
})
