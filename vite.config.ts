import { defineConfig } from 'vite';
import { resolve } from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@player': resolve(__dirname, 'src/player'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@subtitle': resolve(__dirname, 'src/subtitle'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@input': resolve(__dirname, 'src/input'),
      '@settings': resolve(__dirname, 'src/settings'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    port: 3002,
    open: true,
    headers: {
      // Required for ffmpeg.wasm SharedArrayBuffer support
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['player-core', '@ffmpeg/ffmpeg', '@ffmpeg/util'], // WASM packages
  },
});
