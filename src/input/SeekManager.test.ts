/**
 * SeekManager tests - Debouncing, validation, and cancellation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SeekManager, type SeekManagerConfig } from './SeekManager';

describe('SeekManager', () => {
  let seekManager: SeekManager;
  let onSeekMock: ReturnType<typeof vi.fn>;

  const defaultConfig: SeekManagerConfig = {
    duration: 120,
    debounceMs: 200,
    onSeek: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    onSeekMock = vi.fn();
    seekManager = new SeekManager({
      ...defaultConfig,
      onSeek: onSeekMock,
    });
  });

  afterEach(() => {
    seekManager.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('seek()', () => {
    it('should debounce seek calls', () => {
      seekManager.seek(10);
      seekManager.seek(20);
      seekManager.seek(30);

      expect(onSeekMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);

      expect(onSeekMock).toHaveBeenCalledTimes(1);
      expect(onSeekMock).toHaveBeenCalledWith(30);
    });

    it('should execute immediately when immediate flag is true', () => {
      seekManager.seek(30, true);

      expect(onSeekMock).toHaveBeenCalledTimes(1);
      expect(onSeekMock).toHaveBeenCalledWith(30);
    });

    it('should clamp timestamp to 0 when negative', () => {
      seekManager.seek(-10, true);

      expect(onSeekMock).toHaveBeenCalledWith(0);
    });

    it('should clamp timestamp to duration when exceeding', () => {
      seekManager.seek(150, true);

      expect(onSeekMock).toHaveBeenCalledWith(120);
    });

    it('should allow seeking to exact duration', () => {
      seekManager.seek(120, true);

      expect(onSeekMock).toHaveBeenCalledWith(120);
    });

    it('should allow seeking to 0', () => {
      seekManager.seek(0, true);

      expect(onSeekMock).toHaveBeenCalledWith(0);
    });

    it('should reset debounce timer on new seek call', () => {
      seekManager.seek(10);

      vi.advanceTimersByTime(150);
      seekManager.seek(20);

      vi.advanceTimersByTime(150);
      expect(onSeekMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(onSeekMock).toHaveBeenCalledTimes(1);
      expect(onSeekMock).toHaveBeenCalledWith(20);
    });
  });

  describe('seekRelative()', () => {
    it('should seek relative to current time', () => {
      seekManager.setCurrentTime(30);
      seekManager.seekRelative(10, true);

      expect(onSeekMock).toHaveBeenCalledWith(40);
    });

    it('should handle negative delta', () => {
      seekManager.setCurrentTime(30);
      seekManager.seekRelative(-10, true);

      expect(onSeekMock).toHaveBeenCalledWith(20);
    });

    it('should clamp result to valid range', () => {
      seekManager.setCurrentTime(10);
      seekManager.seekRelative(-20, true);

      expect(onSeekMock).toHaveBeenCalledWith(0);
    });

    it('should debounce relative seeks by default', () => {
      seekManager.setCurrentTime(30);
      seekManager.seekRelative(5);
      seekManager.seekRelative(5);
      seekManager.seekRelative(5);

      expect(onSeekMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);

      // Note: each seekRelative uses the currentTime at time of call
      // so we get 30+5+5+5 = 45? No, each uses initial currentTime = 30
      // Actually, seekRelative doesn't update currentTime until onSeek completes
      // So all three will be 30+5=35, 30+5=35, 30+5=35 -> last one wins = 35
      expect(onSeekMock).toHaveBeenCalledTimes(1);
      expect(onSeekMock).toHaveBeenCalledWith(35);
    });
  });

  describe('cancel()', () => {
    it('should cancel pending seek', () => {
      seekManager.seek(30);

      expect(onSeekMock).not.toHaveBeenCalled();

      seekManager.cancel();
      vi.advanceTimersByTime(200);

      expect(onSeekMock).not.toHaveBeenCalled();
    });

    it('should not affect already executed seeks', () => {
      seekManager.seek(30, true);
      expect(onSeekMock).toHaveBeenCalledTimes(1);

      seekManager.cancel();

      // No additional calls
      expect(onSeekMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('setCurrentTime()', () => {
    it('should update current time for relative seeks', () => {
      seekManager.setCurrentTime(60);
      seekManager.seekRelative(10, true);

      expect(onSeekMock).toHaveBeenCalledWith(70);
    });
  });

  describe('setDuration()', () => {
    it('should update duration for validation', () => {
      seekManager.setDuration(60);
      seekManager.seek(100, true);

      expect(onSeekMock).toHaveBeenCalledWith(60);
    });

    it('should clamp existing pending seek to new duration', () => {
      seekManager.seek(100);
      seekManager.setDuration(50);

      vi.advanceTimersByTime(200);

      expect(onSeekMock).toHaveBeenCalledWith(50);
    });
  });

  describe('isPending()', () => {
    it('should return true when seek is pending', () => {
      seekManager.seek(30);

      expect(seekManager.isPending()).toBe(true);
    });

    it('should return false when no seek is pending', () => {
      expect(seekManager.isPending()).toBe(false);
    });

    it('should return false after seek completes', () => {
      seekManager.seek(30);
      vi.advanceTimersByTime(200);

      expect(seekManager.isPending()).toBe(false);
    });

    it('should return false after cancel', () => {
      seekManager.seek(30);
      seekManager.cancel();

      expect(seekManager.isPending()).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('should cancel pending seeks', () => {
      seekManager.seek(30);
      seekManager.dispose();

      vi.advanceTimersByTime(200);

      expect(onSeekMock).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      const zeroManager = new SeekManager({
        duration: 0,
        debounceMs: 200,
        onSeek: onSeekMock,
      });

      zeroManager.seek(10, true);
      expect(onSeekMock).toHaveBeenCalledWith(0);

      zeroManager.dispose();
    });

    it('should handle very small debounce', () => {
      const fastManager = new SeekManager({
        duration: 120,
        debounceMs: 1,
        onSeek: onSeekMock,
      });

      fastManager.seek(30);
      vi.advanceTimersByTime(1);

      expect(onSeekMock).toHaveBeenCalledWith(30);

      fastManager.dispose();
    });

    it('should handle zero debounce (immediate)', () => {
      const immediateManager = new SeekManager({
        duration: 120,
        debounceMs: 0,
        onSeek: onSeekMock,
      });

      immediateManager.seek(30);
      vi.advanceTimersByTime(0);

      expect(onSeekMock).toHaveBeenCalledWith(30);

      immediateManager.dispose();
    });
  });
});
