import { defineConfig } from 'vite';

export default defineConfig({
  root: 'dist',
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: '../build',
    emptyOutDir: true
  }
});