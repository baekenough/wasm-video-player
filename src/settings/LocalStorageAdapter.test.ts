/**
 * LocalStorageAdapter tests
 *
 * Tests for localStorage-based settings persistence.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { createDefaultSettings } from './defaults';
import type { SettingsData } from './types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    adapter = new LocalStorageAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default storage key', async () => {
      const data = createDefaultSettings();
      await adapter.save(data);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'wasm-video-player-settings',
        expect.any(String)
      );
    });

    it('should accept custom storage key', async () => {
      const customAdapter = new LocalStorageAdapter({ storageKey: 'custom-key' });
      const data = createDefaultSettings();
      await customAdapter.save(data);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('custom-key', expect.any(String));
    });
  });

  describe('save', () => {
    it('should save settings to localStorage', async () => {
      const data = createDefaultSettings();
      await adapter.save(data);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0]![1]!) as SettingsData;
      expect(savedData).toEqual(data);
    });

    it('should serialize data as JSON', async () => {
      const data = createDefaultSettings();
      data.audio.volume = 0.5;
      await adapter.save(data);

      const serialized = localStorageMock.setItem.mock.calls[0]![1]!;
      expect(() => JSON.parse(serialized)).not.toThrow();

      const parsed = JSON.parse(serialized) as SettingsData;
      expect(parsed.audio.volume).toBe(0.5);
    });

    it('should throw error on localStorage failure', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const data = createDefaultSettings();
      await expect(adapter.save(data)).rejects.toThrow('Settings save failed');
    });
  });

  describe('load', () => {
    it('should return null when no data exists', async () => {
      const result = await adapter.load();
      expect(result).toBeNull();
    });

    it('should load and parse stored settings', async () => {
      const data = createDefaultSettings();
      data.seek.shortInterval = 15;
      localStorageMock.setItem('wasm-video-player-settings', JSON.stringify(data));

      const result = await adapter.load();

      expect(result).toEqual(data);
      expect(result?.seek.shortInterval).toBe(15);
    });

    it('should return null for invalid JSON', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.setItem('wasm-video-player-settings', 'invalid json');
      localStorageMock.getItem.mockReturnValueOnce('invalid json');

      const result = await adapter.load();

      expect(result).toBeNull();
      consoleWarn.mockRestore();
    });

    it('should return null for invalid structure', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidData = { seek: { shortInterval: 5 } }; // Missing required fields
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(invalidData));

      const result = await adapter.load();

      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith('Invalid settings data in localStorage, ignoring');
      consoleWarn.mockRestore();
    });

    it('should validate all required sections exist', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const partialData = {
        seek: { shortInterval: 5, longInterval: 30 },
        // Missing other sections
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(partialData));

      const result = await adapter.load();

      expect(result).toBeNull();
      consoleWarn.mockRestore();
    });

    it('should validate field types', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidData = createDefaultSettings() as unknown as Record<string, unknown>;
      (invalidData['seek'] as Record<string, unknown>)['shortInterval'] = 'not a number';
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(invalidData));

      const result = await adapter.load();

      expect(result).toBeNull();
      consoleWarn.mockRestore();
    });
  });

  describe('clear', () => {
    it('should remove settings from localStorage', async () => {
      const data = createDefaultSettings();
      await adapter.save(data);

      await adapter.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('wasm-video-player-settings');
    });

    it('should throw error on localStorage failure', async () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      await expect(adapter.clear()).rejects.toThrow('Settings clear failed');
    });
  });

  describe('validation', () => {
    it('should accept valid settings data', async () => {
      const validData = createDefaultSettings();
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(validData));

      const result = await adapter.load();

      expect(result).toEqual(validData);
    });

    it('should reject data with missing subtitle fields', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = createDefaultSettings() as unknown as Record<string, Record<string, unknown>>;
      data['subtitle']!['color'] = 123; // Wrong type
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(data));

      const result = await adapter.load();

      expect(result).toBeNull();
      consoleWarn.mockRestore();
    });

    it('should reject data with missing playback fields', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = createDefaultSettings() as unknown as Record<string, Record<string, unknown>>;
      data['playback']!['loop'] = 'yes'; // Wrong type
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(data));

      const result = await adapter.load();

      expect(result).toBeNull();
      consoleWarn.mockRestore();
    });

    it('should reject non-object data', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValueOnce('"string value"');

      const result = await adapter.load();

      expect(result).toBeNull();
      consoleWarn.mockRestore();
    });

    it('should reject null section values', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = { seek: null, subtitle: {}, playback: {}, ui: {}, audio: {} };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(data));

      const result = await adapter.load();

      expect(result).toBeNull();
      consoleWarn.mockRestore();
    });
  });
});
