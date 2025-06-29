// client/vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'types': path.resolve(__dirname, '../types'),
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  esbuild: {
    format: 'esm',
  },
});