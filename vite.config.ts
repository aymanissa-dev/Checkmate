import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bind to all interfaces so the dev server is reachable inside Cloud Agent VMs.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});
