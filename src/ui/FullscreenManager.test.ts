/**
 * FullscreenManager class tests - Fullscreen API wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FullscreenManager, type FullscreenManagerConfig } from './FullscreenManager';

describe('FullscreenManager', () => {
  let fullscreenManager: FullscreenManager;
  let element: HTMLElement;
  let originalFullscreenElement: Element | null;
  let originalFullscreenEnabled: boolean;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);

    // Store original values
    originalFullscreenElement = document.fullscreenElement;
    originalFullscreenEnabled = document.fullscreenEnabled;

    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'fullscreenEnabled', {
      value: true,
      writable: true,
      configurable: true,
    });

    const config: FullscreenManagerConfig = {
      element,
    };

    fullscreenManager = new FullscreenManager(config);
  });

  afterEach(() => {
    fullscreenManager.dispose();
    document.body.removeChild(element);

    // Restore original values
    Object.defineProperty(document, 'fullscreenElement', {
      value: originalFullscreenElement,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'fullscreenEnabled', {
      value: originalFullscreenEnabled,
      writable: true,
      configurable: true,
    });

    vi.restoreAllMocks();
  });

  describe('isSupported()', () => {
    it('should return true when fullscreen is supported', () => {
      fullscreenManager.init();

      expect(fullscreenManager.isSupported()).toBe(true);
    });

    it('should return false when fullscreen is not supported', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });

      fullscreenManager.init();

      expect(fullscreenManager.isSupported()).toBe(false);
    });
  });

  describe('isFullscreen()', () => {
    it('should return false when not in fullscreen', () => {
      fullscreenManager.init();

      expect(fullscreenManager.isFullscreen()).toBe(false);
    });

    it('should return true when in fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: element,
        configurable: true,
      });

      fullscreenManager.init();

      expect(fullscreenManager.isFullscreen()).toBe(true);
    });
  });

  describe('enter()', () => {
    it('should call requestFullscreen', async () => {
      element.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      fullscreenManager.init();

      await fullscreenManager.enter();

      expect(element.requestFullscreen).toHaveBeenCalled();
    });

    it('should not call requestFullscreen if already fullscreen', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: element,
        configurable: true,
      });
      element.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      fullscreenManager.init();

      await fullscreenManager.enter();

      expect(element.requestFullscreen).not.toHaveBeenCalled();
    });

    it('should throw if fullscreen not supported', async () => {
      // Remove all fullscreen methods
      const originalRequestFullscreen = element.requestFullscreen;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (element as any).requestFullscreen = undefined;
      fullscreenManager.init();

      await expect(fullscreenManager.enter()).rejects.toThrow('Fullscreen not supported');

      element.requestFullscreen = originalRequestFullscreen;
    });

    it('should try webkitRequestFullscreen as fallback', async () => {
      const originalRequestFullscreen = element.requestFullscreen;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (element as any).requestFullscreen = undefined;
      (element as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen =
        vi.fn().mockResolvedValue(undefined);
      fullscreenManager.init();

      await fullscreenManager.enter();

      expect(
        (element as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen
      ).toHaveBeenCalled();

      element.requestFullscreen = originalRequestFullscreen;
    });
  });

  describe('exit()', () => {
    it('should call exitFullscreen', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: element,
        configurable: true,
      });
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
      fullscreenManager.init();

      await fullscreenManager.exit();

      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should not call exitFullscreen if not fullscreen', async () => {
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
      fullscreenManager.init();

      await fullscreenManager.exit();

      expect(document.exitFullscreen).not.toHaveBeenCalled();
    });

    it('should throw if fullscreen not supported', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: element,
        configurable: true,
      });
      const originalExitFullscreen = document.exitFullscreen;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).exitFullscreen = undefined;
      fullscreenManager.init();

      await expect(fullscreenManager.exit()).rejects.toThrow('Fullscreen not supported');

      document.exitFullscreen = originalExitFullscreen;
    });
  });

  describe('toggle()', () => {
    it('should enter fullscreen when not fullscreen', async () => {
      element.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      fullscreenManager.init();

      await fullscreenManager.toggle();

      expect(element.requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when fullscreen', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: element,
        configurable: true,
      });
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
      fullscreenManager.init();

      await fullscreenManager.toggle();

      expect(document.exitFullscreen).toHaveBeenCalled();
    });
  });

  describe('onChange()', () => {
    it('should register callback', () => {
      fullscreenManager.init();
      const callback = vi.fn();

      fullscreenManager.onChange(callback);

      // Trigger fullscreen change
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should call callback with true when entering fullscreen', () => {
      fullscreenManager.init();
      const callback = vi.fn();
      fullscreenManager.onChange(callback);

      Object.defineProperty(document, 'fullscreenElement', {
        value: element,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should call callback with false when exiting fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: element,
        configurable: true,
      });
      fullscreenManager.init();
      const callback = vi.fn();
      fullscreenManager.onChange(callback);

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  describe('offChange()', () => {
    it('should unregister callback', () => {
      fullscreenManager.init();
      const callback = vi.fn();
      fullscreenManager.onChange(callback);

      fullscreenManager.offChange(callback);
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('should remove all event listeners', () => {
      fullscreenManager.init();
      const callback = vi.fn();
      fullscreenManager.onChange(callback);

      fullscreenManager.dispose();
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear all callbacks', () => {
      fullscreenManager.init();
      const callback = vi.fn();
      fullscreenManager.onChange(callback);

      fullscreenManager.dispose();

      // Re-init and trigger change - old callback should not be called
      fullscreenManager.init();
      document.dispatchEvent(new Event('fullscreenchange'));

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
