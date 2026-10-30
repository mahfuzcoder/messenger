/** Vite development server and production output configuration for Nook Messenger. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keeps the React development server separate while Node owns API requests.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true }
    }
  },
  build: { outDir: 'dist', emptyOutDir: true }
});
