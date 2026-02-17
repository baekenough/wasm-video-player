import { defineConfig } from 'vite';
import { resolve } from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Tauri provides its own secure context, so basicSsl is not needed
const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: isTauri ? [] : [basicSsl()],
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
    open: !isTauri,
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
