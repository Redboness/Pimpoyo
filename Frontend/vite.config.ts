import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
// Básicamente decimos en que puerto se hostea la aplicación y en que "direcciones" se permite acceder a ella
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ["cosmic-thankful-humpback.ngrok-free.app", "sajl.cc"],
    proxy: {
      // Requests starting with /api will be forwarded to your backend
      '/api': {
        target: 'http://localhost:8000', // Donde sea que esté corriendo el backend, en este caso en local en el puerto 8000-
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Quitar /api del path, se añade para evitar conflictos.
      },
    },
  },
})
