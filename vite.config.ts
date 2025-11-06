import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite para React.
// Incluye un proxy en desarrollo para redirigir llamadas al API y evitar CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy de API durante el desarrollo local
      '/api-proxy': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
});
