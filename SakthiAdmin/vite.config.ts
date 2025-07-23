import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://10.75.46.152:3002', // Proxy API requests to our proxy server
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
