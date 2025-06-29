// client/vite.config.ts
import { defineConfig } from 'vite';
import * as path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
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