/**
 * Controls class tests - Control bar visibility and auto-hide
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Controls, type ControlsConfig } from './Controls';
import type { Player } from '@player/Player';
import { PlayerState } from '@player/Player';

/**
 * Mock player interface for testing
 */
interface MockPlayer {
  getState: ReturnType<typeof vi.fn<[], unknown>>;
  getDuration: ReturnType<typeof vi.fn<[], number>>;
  getCurrentTime: ReturnType<typeof vi.fn<[], number>>;
  getVolume: ReturnType<typeof vi.fn<[], number>>;
  setVolume: ReturnType<typeof vi.fn<[number], void>>;
  isMuted: ReturnType<typeof vi.fn<[], boolean>>;
  mute: ReturnType<typeof vi.fn<[], void>>;
  unmute: ReturnType<typeof vi.fn<[], void>>;
  play: ReturnType<typeof vi.fn<[], Promise<void>>>;
  pause: ReturnType<typeof vi.fn<[], void>>;
  seek: ReturnType<typeof vi.fn<[number], Promise<void>>>;
  on: (event: string, listener: (data: unknown) => void) => void;
  off: (event: string, listener: (data: unknown) => void) => void;
  triggerEvent: (event: string, data: unknown) => void;
}

// Create mock player
const createMockPlayer = (): MockPlayer => {
  const eventListeners = new Map<string, Set<(data: unknown) => void>>();

  return {
    getState: vi.fn().mockReturnValue(PlayerState.Ready),
    getDuration: vi.fn().mockReturnValue(120),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getVolume: vi.fn().mockReturnValue(1.0),
    setVolume: vi.fn(),
    isMuted: vi.fn().mockReturnValue(false),
    mute: vi.fn(),
    unmute: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, listener: (data: unknown) => void) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(listener);
    }),
    off: vi.fn((event: string, listener: (data: unknown) => void) => {
      eventListeners.get(event)?.delete(listener);
    }),
    triggerEvent: (event: string, data: unknown) => {
      eventListeners.get(event)?.forEach((listener) => listener(data));
    },
  };
};

describe('Controls', () => {
  let controls: Controls;
  let mockPlayer: MockPlayer;
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    mockPlayer = createMockPlayer();

    const config: ControlsConfig = {
      player: mockPlayer as unknown as Player,
      container,
    };

    controls = new Controls(config);
  });

  afterEach(() => {
    controls.dispose();
    document.body.removeChild(container);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should create control bar element on init', () => {
      controls.init();

      const controlBar = container.querySelector('.control-bar');
      expect(controlBar).not.toBeNull();
    });

    it('should be visible by default', () => {
      controls.init();

      expect(controls.isControlBarVisible()).toBe(true);
    });

    it('should attach event listeners on init', () => {
      controls.init();

      expect(mockPlayer.on).toHaveBeenCalledWith('statechange', expect.any(Function));
    });
  });

  describe('show()', () => {
    it('should show the control bar', () => {
      controls.init();
      controls.hide();

      controls.show();

      expect(controls.isControlBarVisible()).toBe(true);
      expect(controls.getControlBar()?.classList.contains('hidden')).toBe(false);
    });

    it('should do nothing if already visible', () => {
      controls.init();
      const controlBar = controls.getControlBar();

      controls.show();

      expect(controlBar?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('hide()', () => {
    it('should hide the control bar', () => {
      controls.init();

      controls.hide();

      expect(controls.isControlBarVisible()).toBe(false);
      expect(controls.getControlBar()?.classList.contains('hidden')).toBe(true);
    });

    it('should do nothing if already hidden', () => {
      controls.init();
      controls.hide();

      controls.hide();

      expect(controls.getControlBar()?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('toggle()', () => {
    it('should hide when visible', () => {
      controls.init();

      controls.toggle();

      expect(controls.isControlBarVisible()).toBe(false);
    });

    it('should show when hidden', () => {
      controls.init();
      controls.hide();

      controls.toggle();

      expect(controls.isControlBarVisible()).toBe(true);
    });
  });

  describe('auto-hide behavior', () => {
    it('should auto-hide after 3 seconds when playing', () => {
      controls.init();
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);

      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Ready,
        newState: PlayerState.Playing,
      });

      expect(controls.isControlBarVisible()).toBe(true);

      vi.advanceTimersByTime(3000);

      expect(controls.isControlBarVisible()).toBe(false);
    });

    it('should not auto-hide when paused', () => {
      controls.init();
      mockPlayer.getState.mockReturnValue(PlayerState.Paused);

      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Playing,
        newState: PlayerState.Paused,
      });

      vi.advanceTimersByTime(5000);

      expect(controls.isControlBarVisible()).toBe(true);
    });

    it('should show and reset timer on mouse move while playing', () => {
      controls.init();
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);

      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Ready,
        newState: PlayerState.Playing,
      });

      // Wait 2 seconds
      vi.advanceTimersByTime(2000);

      // Mouse move should reset timer
      container.dispatchEvent(new MouseEvent('mousemove'));

      // Wait another 2 seconds (total 4 from start, but only 2 from mouse move)
      vi.advanceTimersByTime(2000);
      expect(controls.isControlBarVisible()).toBe(true);

      // Wait 1 more second (3 seconds from mouse move)
      vi.advanceTimersByTime(1000);
      expect(controls.isControlBarVisible()).toBe(false);
    });

    it('should show on key press while playing', () => {
      controls.init();
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);

      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Ready,
        newState: PlayerState.Playing,
      });

      vi.advanceTimersByTime(3000);
      expect(controls.isControlBarVisible()).toBe(false);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space' }));

      expect(controls.isControlBarVisible()).toBe(true);
    });

    it('should cancel auto-hide when transitioning to paused', () => {
      controls.init();
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);

      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Ready,
        newState: PlayerState.Playing,
      });

      vi.advanceTimersByTime(2000);

      mockPlayer.getState.mockReturnValue(PlayerState.Paused);
      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Playing,
        newState: PlayerState.Paused,
      });

      vi.advanceTimersByTime(5000);

      expect(controls.isControlBarVisible()).toBe(true);
    });
  });

  describe('getControlBar()', () => {
    it('should return null before init', () => {
      expect(controls.getControlBar()).toBeNull();
    });

    it('should return control bar element after init', () => {
      controls.init();

      const controlBar = controls.getControlBar();
      expect(controlBar).toBeInstanceOf(HTMLElement);
      expect(controlBar?.className).toBe('control-bar');
    });
  });

  describe('dispose()', () => {
    it('should remove control bar from container', () => {
      controls.init();

      controls.dispose();

      expect(container.querySelector('.control-bar')).toBeNull();
    });

    it('should remove event listeners', () => {
      controls.init();

      controls.dispose();

      expect(mockPlayer.off).toHaveBeenCalledWith('statechange', expect.any(Function));
    });

    it('should set control bar to null', () => {
      controls.init();

      controls.dispose();

      expect(controls.getControlBar()).toBeNull();
    });

    it('should cancel any pending auto-hide timer', () => {
      controls.init();
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);

      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Ready,
        newState: PlayerState.Playing,
      });

      controls.dispose();

      // Should not throw even after timer would have fired
      vi.advanceTimersByTime(5000);
    });
  });
});
