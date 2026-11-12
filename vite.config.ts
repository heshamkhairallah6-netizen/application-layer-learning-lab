import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // Only real API paths are proxied. A bare '/api' prefix also matched the
      // '/api-lab' page route and broke it in the dev server.
      '^/api/': 'http://127.0.0.1:3000',
    },
  },
});
