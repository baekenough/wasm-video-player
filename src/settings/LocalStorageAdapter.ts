/**
 * LocalStorageAdapter - Web Storage persistence adapter
 *
 * Implements StorageAdapter interface using localStorage
 * for persisting settings between sessions.
 */

import type { SettingsData, StorageAdapter } from './types';

/**
 * Default storage key for settings
 */
const DEFAULT_STORAGE_KEY = 'wasm-video-player-settings';

/**
 * LocalStorage adapter configuration
 */
export interface LocalStorageAdapterConfig {
  /** Storage key to use */
  storageKey?: string;
}

/**
 * LocalStorage adapter for settings persistence
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly storageKey: string;

  constructor(config: LocalStorageAdapterConfig = {}) {
    this.storageKey = config.storageKey ?? DEFAULT_STORAGE_KEY;
  }

  /**
   * Load settings from localStorage
   */
  async load(): Promise<SettingsData | null> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as unknown;
      if (!this.isValidSettingsData(parsed)) {
        console.warn('Invalid settings data in localStorage, ignoring');
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      return null;
    }
  }

  /**
   * Save settings to localStorage
   */
  async save(data: SettingsData): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      throw new Error('Settings save failed');
    }
  }

  /**
   * Clear settings from localStorage
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear settings from localStorage:', error);
      throw new Error('Settings clear failed');
    }
  }

  /**
   * Validate that data matches SettingsData structure
   */
  private isValidSettingsData(data: unknown): data is SettingsData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;
    const requiredSections = ['seek', 'subtitle', 'playback', 'ui', 'audio'];

    for (const section of requiredSections) {
      if (typeof obj[section] !== 'object' || obj[section] === null) {
        return false;
      }
    }

    // Validate seek section
    const seek = obj['seek'] as Record<string, unknown>;
    if (typeof seek['shortInterval'] !== 'number' || typeof seek['longInterval'] !== 'number') {
      return false;
    }

    // Validate subtitle section
    const subtitle = obj['subtitle'] as Record<string, unknown>;
    if (
      typeof subtitle['fontSize'] !== 'number' ||
      typeof subtitle['color'] !== 'string' ||
      typeof subtitle['backgroundColor'] !== 'string' ||
      typeof subtitle['timingOffset'] !== 'number' ||
      typeof subtitle['enabled'] !== 'boolean'
    ) {
      return false;
    }

    // Validate playback section
    const playback = obj['playback'] as Record<string, unknown>;
    if (
      typeof playback['autoPlay'] !== 'boolean' ||
      typeof playback['loop'] !== 'boolean' ||
      typeof playback['speed'] !== 'number'
    ) {
      return false;
    }

    // Validate ui section
    const ui = obj['ui'] as Record<string, unknown>;
    if (typeof ui['controlBarTimeout'] !== 'number') {
      return false;
    }

    // Validate audio section
    const audio = obj['audio'] as Record<string, unknown>;
    if (typeof audio['volume'] !== 'number' || typeof audio['muted'] !== 'boolean') {
      return false;
    }

    return true;
  }
}
