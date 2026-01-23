/**
 * Settings tests
 *
 * Tests for the Settings class including get/set operations,
 * observer pattern, validation, and reset functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Settings } from './Settings';
import { DEFAULT_SETTINGS, createDefaultSettings } from './defaults';
import type { StorageAdapter } from './types';

describe('Settings', () => {
  let settings: Settings;

  beforeEach(() => {
    settings = new Settings();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const seekSettings = settings.get('seek');

      expect(seekSettings.shortInterval).toBe(DEFAULT_SETTINGS.seek.shortInterval);
      expect(seekSettings.longInterval).toBe(DEFAULT_SETTINGS.seek.longInterval);
    });

    it('should accept initial data in constructor', () => {
      const customSettings = new Settings({
        seek: { shortInterval: 10, longInterval: 60 },
      });

      const seekSettings = customSettings.get('seek');

      expect(seekSettings.shortInterval).toBe(10);
      expect(seekSettings.longInterval).toBe(60);
    });

    it('should merge partial initial data with defaults', () => {
      const customSettings = new Settings({
        audio: { volume: 0.5, muted: false },
      });

      expect(customSettings.get('audio').volume).toBe(0.5);
      expect(customSettings.get('seek').shortInterval).toBe(DEFAULT_SETTINGS.seek.shortInterval);
    });
  });

  describe('get', () => {
    it('should return a copy of section data', () => {
      const seek1 = settings.get('seek');
      const seek2 = settings.get('seek');

      expect(seek1).toEqual(seek2);
      expect(seek1).not.toBe(seek2);
    });

    it('should return correct data for each section', () => {
      expect(settings.get('seek')).toEqual(DEFAULT_SETTINGS.seek);
      expect(settings.get('subtitle')).toEqual(DEFAULT_SETTINGS.subtitle);
      expect(settings.get('playback')).toEqual(DEFAULT_SETTINGS.playback);
      expect(settings.get('ui')).toEqual(DEFAULT_SETTINGS.ui);
      expect(settings.get('audio')).toEqual(DEFAULT_SETTINGS.audio);
    });
  });

  describe('getAll', () => {
    it('should return a deep copy of all settings', () => {
      const all1 = settings.getAll();
      const all2 = settings.getAll();

      expect(all1).toEqual(all2);
      expect(all1).not.toBe(all2);
      expect(all1.seek).not.toBe(all2.seek);
    });

    it('should include all sections', () => {
      const all = settings.getAll();

      expect(all).toHaveProperty('seek');
      expect(all).toHaveProperty('subtitle');
      expect(all).toHaveProperty('playback');
      expect(all).toHaveProperty('ui');
      expect(all).toHaveProperty('audio');
    });
  });

  describe('set', () => {
    it('should update a value in a section', () => {
      settings.set('seek', 'shortInterval', 10);

      expect(settings.get('seek').shortInterval).toBe(10);
    });

    it('should not update if value is the same', () => {
      const listener = vi.fn();
      settings.subscribe(listener);

      settings.set('seek', 'shortInterval', DEFAULT_SETTINGS.seek.shortInterval);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should validate numeric values against ranges', () => {
      settings.set('audio', 'volume', 2.0);
      expect(settings.get('audio').volume).toBe(1.0);

      settings.set('audio', 'volume', -0.5);
      expect(settings.get('audio').volume).toBe(0);
    });

    it('should clamp values to valid range', () => {
      settings.set('playback', 'speed', 10);
      expect(settings.get('playback').speed).toBe(4.0);

      settings.set('playback', 'speed', 0.1);
      expect(settings.get('playback').speed).toBe(0.25);
    });
  });

  describe('update', () => {
    it('should update multiple values at once', () => {
      settings.update({
        seek: { shortInterval: 10 },
        audio: { volume: 0.5 },
      });

      expect(settings.get('seek').shortInterval).toBe(10);
      expect(settings.get('audio').volume).toBe(0.5);
    });

    it('should notify listeners for each changed value', () => {
      const listener = vi.fn();
      settings.subscribe(listener);

      // Both values differ from defaults (5 and 60), so both trigger notifications
      settings.update({
        seek: { shortInterval: 10, longInterval: 90 },
      });

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('should reset all settings to defaults', () => {
      settings.set('seek', 'shortInterval', 20);
      settings.set('audio', 'volume', 0.3);

      settings.reset();

      expect(settings.get('seek').shortInterval).toBe(DEFAULT_SETTINGS.seek.shortInterval);
      expect(settings.get('audio').volume).toBe(DEFAULT_SETTINGS.audio.volume);
    });

    it('should notify listeners for each reset value', () => {
      const listener = vi.fn();
      settings.set('seek', 'shortInterval', 20);
      settings.subscribe(listener);

      settings.reset();

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          section: 'seek',
          key: 'shortInterval',
          newValue: DEFAULT_SETTINGS.seek.shortInterval,
        })
      );
    });

    it('should not notify if value already at default', () => {
      const listener = vi.fn();
      settings.subscribe(listener);

      settings.reset();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('resetSection', () => {
    it('should reset only the specified section', () => {
      settings.set('seek', 'shortInterval', 20);
      settings.set('audio', 'volume', 0.3);

      settings.resetSection('seek');

      expect(settings.get('seek').shortInterval).toBe(DEFAULT_SETTINGS.seek.shortInterval);
      expect(settings.get('audio').volume).toBe(0.3);
    });

    it('should notify listeners for reset section values', () => {
      const listener = vi.fn();
      settings.set('seek', 'shortInterval', 20);
      settings.set('seek', 'longInterval', 120);
      settings.subscribe(listener);

      settings.resetSection('seek');

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribe', () => {
    it('should add a listener that receives change events', () => {
      const listener = vi.fn();
      settings.subscribe(listener);

      settings.set('seek', 'shortInterval', 15);

      expect(listener).toHaveBeenCalledWith({
        section: 'seek',
        key: 'shortInterval',
        oldValue: DEFAULT_SETTINGS.seek.shortInterval,
        newValue: 15,
      });
    });

    it('should return an unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = settings.subscribe(listener);

      unsubscribe();
      settings.set('seek', 'shortInterval', 15);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      settings.subscribe(listener1);
      settings.subscribe(listener2);

      settings.set('seek', 'shortInterval', 15);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should catch and log listener errors', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      settings.subscribe(errorListener);
      settings.subscribe(normalListener);

      settings.set('seek', 'shortInterval', 15);

      expect(consoleError).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('save/load', () => {
    it('should throw error when no storage adapter is set', async () => {
      await expect(settings.save()).rejects.toThrow('No storage adapter configured');
      await expect(settings.load()).rejects.toThrow('No storage adapter configured');
    });

    it('should save settings using storage adapter', async () => {
      const mockAdapter: StorageAdapter = {
        load: vi.fn(),
        save: vi.fn(),
        clear: vi.fn(),
      };

      settings.setStorageAdapter(mockAdapter);
      await settings.save();

      expect(mockAdapter.save).toHaveBeenCalledWith(settings.getAll());
    });

    it('should load settings from storage adapter', async () => {
      const savedData = createDefaultSettings();
      savedData.seek.shortInterval = 20;
      savedData.audio.volume = 0.5;

      const mockAdapter: StorageAdapter = {
        load: vi.fn().mockResolvedValue(savedData),
        save: vi.fn(),
        clear: vi.fn(),
      };

      settings.setStorageAdapter(mockAdapter);
      await settings.load();

      expect(settings.get('seek').shortInterval).toBe(20);
      expect(settings.get('audio').volume).toBe(0.5);
    });

    it('should handle null from storage adapter', async () => {
      const mockAdapter: StorageAdapter = {
        load: vi.fn().mockResolvedValue(null),
        save: vi.fn(),
        clear: vi.fn(),
      };

      settings.setStorageAdapter(mockAdapter);
      await settings.load();

      expect(settings.getAll()).toEqual(createDefaultSettings());
    });
  });
});
