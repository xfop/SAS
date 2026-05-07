import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// server url - change this for production
var SERVER_URL = process.env.API_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: SERVER_URL,
        changeOrigin: true
      }
    }
  },
  // for production build
  build: {
    outDir: 'dist'
  }
});
