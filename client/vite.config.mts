// client/vite.config.ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'types': path.resolve(__dirname, '../types'),
    },
  },
  build: {
    outDir: 'dist',
  },
  esbuild: {
    format: 'esm',
  },
});