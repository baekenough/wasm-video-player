/**
 * WASM Video Player - Application Entry Point
 *
 * Initializes the video player with WASM-powered decoding,
 * WebGL rendering, and Web Audio for playback.
 */

import { App, type AppConfig } from './App';

/**
 * Global app instance
 */
let app: App | null = null;

/**
 * Get the global app instance
 */
export function getApp(): App | null {
  return app;
}

/**
 * Initialize the application
 *
 * @param _config - Optional configuration overrides (reserved for future use)
 * @returns The initialized App instance
 */
export async function initApp(_config?: Partial<AppConfig>): Promise<App> {
  if (app) {
    console.warn('App already initialized');
    return app;
  }

  const container = document.getElementById('app');
  if (!container) {
    throw new Error('App container not found');
  }

  app = new App(container);
  await app.init();

  return app;
}

/**
 * Dispose the application and clean up resources
 */
export function disposeApp(): void {
  if (app) {
    app.dispose();
    app = null;
  }
}

// Re-export App class and types
export { App, type AppConfig } from './App';

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await initApp();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  });
}
