import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/main.ts'],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
    server: {
      deps: {
        inline: [/player_core/],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@player': resolve(__dirname, 'src/player'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@subtitle': resolve(__dirname, 'src/subtitle'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@input': resolve(__dirname, 'src/input'),
      '@settings': resolve(__dirname, 'src/settings'),
      // Mock WASM module for tests
      '../../pkg/player_core': resolve(__dirname, 'src/__mocks__/player_core.ts'),
    },
  },
});
