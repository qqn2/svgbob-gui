import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

const asciiflowRoot = path.resolve(__dirname, 'asciiflow-upstream');

export default defineConfig({
  root: path.join(asciiflowRoot, 'client'),
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      '#asciiflow': asciiflowRoot,
    },
  },
  optimizeDeps: {
    exclude: ['svgbob-wasm'],
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
