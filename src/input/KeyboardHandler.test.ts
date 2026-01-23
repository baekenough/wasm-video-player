/**
 * KeyboardHandler tests - Key mappings and modifier handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardHandler, type KeyboardHandlerConfig } from './KeyboardHandler';
import type { SettingsData } from '@settings/types';
import { DEFAULT_SETTINGS } from '@settings/defaults';

describe('KeyboardHandler', () => {
  let handler: KeyboardHandler;
  let mockElement: HTMLElement;
  let callbacks: KeyboardHandlerConfig['callbacks'];

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    callbacks = {
      onSeekForward: vi.fn(),
      onSeekBackward: vi.fn(),
      onVolumeUp: vi.fn(),
      onVolumeDown: vi.fn(),
      onTogglePlay: vi.fn(),
      onToggleMute: vi.fn(),
      onToggleFullscreen: vi.fn(),
    };

    handler = new KeyboardHandler({
      settings: DEFAULT_SETTINGS,
      callbacks,
    });
  });

  afterEach(() => {
    handler.detach();
    document.body.removeChild(mockElement);
    vi.restoreAllMocks();
  });

  const createKeyboardEvent = (
    key: string,
    options: Partial<KeyboardEventInit> = {}
  ): KeyboardEvent => {
    return new KeyboardEvent('keydown', {
      key,
      code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
  };

  describe('attach/detach', () => {
    it('should attach event listener to element', () => {
      const addEventListenerSpy = vi.spyOn(mockElement, 'addEventListener');

      handler.attach(mockElement);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should remove event listener on detach', () => {
      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

      handler.attach(mockElement);
      handler.detach();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should detach from previous element when attaching to new one', () => {
      const element2 = document.createElement('div');
      document.body.appendChild(element2);

      const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

      handler.attach(mockElement);
      handler.attach(element2);

      expect(removeEventListenerSpy).toHaveBeenCalled();

      document.body.removeChild(element2);
    });
  });

  describe('seek shortcuts', () => {
    beforeEach(() => {
      handler.attach(mockElement);
    });

    it('should trigger short seek forward on ArrowRight', () => {
      const event = createKeyboardEvent('ArrowRight');
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).toHaveBeenCalledWith(
        DEFAULT_SETTINGS.seek.shortInterval,
        false // not long seek
      );
    });

    it('should trigger short seek backward on ArrowLeft', () => {
      const event = createKeyboardEvent('ArrowLeft');
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekBackward).toHaveBeenCalledWith(
        DEFAULT_SETTINGS.seek.shortInterval,
        false
      );
    });

    it('should trigger long seek forward on Shift+ArrowRight', () => {
      const event = createKeyboardEvent('ArrowRight', { shiftKey: true });
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).toHaveBeenCalledWith(
        DEFAULT_SETTINGS.seek.longInterval,
        true // long seek
      );
    });

    it('should trigger long seek backward on Shift+ArrowLeft', () => {
      const event = createKeyboardEvent('ArrowLeft', { shiftKey: true });
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekBackward).toHaveBeenCalledWith(
        DEFAULT_SETTINGS.seek.longInterval,
        true
      );
    });
  });

  describe('playback shortcuts', () => {
    beforeEach(() => {
      handler.attach(mockElement);
    });

    it('should toggle play/pause on Space', () => {
      const event = createKeyboardEvent(' ', { code: 'Space' });
      mockElement.dispatchEvent(event);

      expect(callbacks.onTogglePlay).toHaveBeenCalled();
    });

    it('should toggle mute on M key', () => {
      const event = createKeyboardEvent('m', { code: 'KeyM' });
      mockElement.dispatchEvent(event);

      expect(callbacks.onToggleMute).toHaveBeenCalled();
    });

    it('should toggle fullscreen on F key', () => {
      const event = createKeyboardEvent('f', { code: 'KeyF' });
      mockElement.dispatchEvent(event);

      expect(callbacks.onToggleFullscreen).toHaveBeenCalled();
    });
  });

  describe('preventDefault handling', () => {
    beforeEach(() => {
      handler.attach(mockElement);
    });

    it('should prevent default for handled keys', () => {
      const event = createKeyboardEvent('ArrowRight');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      mockElement.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default for Space to avoid page scroll', () => {
      const event = createKeyboardEvent(' ', { code: 'Space' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      mockElement.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default for unhandled keys', () => {
      const event = createKeyboardEvent('a');
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      mockElement.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('modifier key combinations', () => {
    beforeEach(() => {
      handler.attach(mockElement);
    });

    it('should ignore Ctrl+key combinations', () => {
      const event = createKeyboardEvent('ArrowRight', { ctrlKey: true });
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).not.toHaveBeenCalled();
    });

    it('should ignore Alt+key combinations', () => {
      const event = createKeyboardEvent('ArrowRight', { altKey: true });
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).not.toHaveBeenCalled();
    });

    it('should ignore Meta+key combinations', () => {
      const event = createKeyboardEvent('ArrowRight', { metaKey: true });
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).not.toHaveBeenCalled();
    });

    it('should handle Shift modifier for long seeks', () => {
      const event = createKeyboardEvent('ArrowRight', { shiftKey: true });
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).toHaveBeenCalled();
    });
  });

  describe('enable/disable', () => {
    beforeEach(() => {
      handler.attach(mockElement);
    });

    it('should not respond when disabled', () => {
      handler.setEnabled(false);

      const event = createKeyboardEvent('ArrowRight');
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).not.toHaveBeenCalled();
    });

    it('should respond after re-enabling', () => {
      handler.setEnabled(false);
      handler.setEnabled(true);

      const event = createKeyboardEvent('ArrowRight');
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).toHaveBeenCalled();
    });

    it('should report enabled state', () => {
      expect(handler.isEnabled()).toBe(true);

      handler.setEnabled(false);
      expect(handler.isEnabled()).toBe(false);
    });
  });

  describe('custom settings', () => {
    it('should use custom seek intervals from settings', () => {
      const customSettings: SettingsData = {
        ...DEFAULT_SETTINGS,
        seek: {
          shortInterval: 10,
          longInterval: 60,
        },
      };

      const customHandler = new KeyboardHandler({
        settings: customSettings,
        callbacks,
      });

      customHandler.attach(mockElement);

      const event = createKeyboardEvent('ArrowRight');
      mockElement.dispatchEvent(event);

      expect(callbacks.onSeekForward).toHaveBeenCalledWith(10, false);

      const shiftEvent = createKeyboardEvent('ArrowRight', { shiftKey: true });
      mockElement.dispatchEvent(shiftEvent);

      expect(callbacks.onSeekForward).toHaveBeenCalledWith(60, true);

      customHandler.detach();
    });
  });

  describe('no attached element', () => {
    it('should not throw when handling events without attachment', () => {
      // Handler not attached, should be safe
      expect(() => handler.detach()).not.toThrow();
    });
  });

  describe('case insensitivity', () => {
    beforeEach(() => {
      handler.attach(mockElement);
    });

    it('should handle uppercase M key', () => {
      const event = createKeyboardEvent('M', { code: 'KeyM' });
      mockElement.dispatchEvent(event);

      expect(callbacks.onToggleMute).toHaveBeenCalled();
    });

    it('should handle uppercase F key', () => {
      const event = createKeyboardEvent('F', { code: 'KeyF' });
      mockElement.dispatchEvent(event);

      expect(callbacks.onToggleFullscreen).toHaveBeenCalled();
    });
  });
});
