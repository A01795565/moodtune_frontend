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
      // Proxy para el servicio FER durante desarrollo
      // Permite usar '/fer-proxy' sin CORS y sin definir VITE_FER_ENDPOINT_URL en dev
      '/fer-proxy': {
        target: process.env.VITE_FER_BASE_URL || 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fer-proxy/, ''),
      },
      // Proxy para el servicio RAG durante desarrollo
      '/rag-proxy': {
        target: process.env.VITE_RAG_BASE_URL || 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rag-proxy/, ''),
      },
      // Proxy para moodtune_music (creación de playlists en proveedores)
      '/music-proxy': {
        target: process.env.VITE_MUSIC_BASE_URL || 'http://localhost:8020',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/music-proxy/, ''),
      },
    },
  },
});
