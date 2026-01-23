/**
 * PlayButton class tests - Play/pause button behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlayButton, type PlayButtonConfig } from './PlayButton';
import type { Player } from '@player/Player';
import { PlayerState } from '@player/Player';

/**
 * Mock player interface for testing
 */
interface MockPlayer {
  getState: ReturnType<typeof vi.fn<[], unknown>>;
  play: ReturnType<typeof vi.fn<[], unknown>>;
  pause: ReturnType<typeof vi.fn<[], unknown>>;
  on: (event: string, listener: (data: unknown) => void) => void;
  off: (event: string, listener: (data: unknown) => void) => void;
  triggerEvent: (event: string, data: unknown) => void;
}

// Create mock player
const createMockPlayer = (): MockPlayer => {
  const eventListeners = new Map<string, Set<(data: unknown) => void>>();

  return {
    getState: vi.fn().mockReturnValue(PlayerState.Ready),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
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

describe('PlayButton', () => {
  let playButton: PlayButton;
  let mockPlayer: MockPlayer;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockPlayer = createMockPlayer();

    const config: PlayButtonConfig = {
      player: mockPlayer as unknown as Player,
      container,
    };

    playButton = new PlayButton(config);
  });

  afterEach(() => {
    playButton.dispose();
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create button element on init', () => {
      playButton.init();

      const button = container.querySelector('.play-button');
      expect(button).not.toBeNull();
      expect(button?.tagName).toBe('BUTTON');
    });

    it('should set button type to button', () => {
      playButton.init();

      const button = playButton.getButton();
      expect(button?.type).toBe('button');
    });

    it('should display play icon when not playing', () => {
      playButton.init();

      const button = playButton.getButton();
      expect(button?.innerHTML).toContain('svg');
      expect(button?.getAttribute('aria-label')).toBe('Play');
    });

    it('should display pause icon when playing', () => {
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);
      playButton.init();

      const button = playButton.getButton();
      expect(button?.getAttribute('aria-label')).toBe('Pause');
    });

    it('should attach event listeners', () => {
      playButton.init();

      expect(mockPlayer.on).toHaveBeenCalledWith('statechange', expect.any(Function));
    });
  });

  describe('click behavior', () => {
    it('should call play() when Ready and clicked', () => {
      mockPlayer.getState.mockReturnValue(PlayerState.Ready);
      playButton.init();

      const button = playButton.getButton();
      button?.click();

      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('should call play() when Paused and clicked', () => {
      mockPlayer.getState.mockReturnValue(PlayerState.Paused);
      playButton.init();

      const button = playButton.getButton();
      button?.click();

      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('should call pause() when Playing and clicked', () => {
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);
      playButton.init();

      const button = playButton.getButton();
      button?.click();

      expect(mockPlayer.pause).toHaveBeenCalled();
    });

    it('should not call play or pause when in other states', () => {
      mockPlayer.getState.mockReturnValue(PlayerState.Loading);
      playButton.init();

      const button = playButton.getButton();
      button?.click();

      expect(mockPlayer.play).not.toHaveBeenCalled();
      expect(mockPlayer.pause).not.toHaveBeenCalled();
    });
  });

  describe('state change updates', () => {
    it('should update icon when state changes to Playing', () => {
      playButton.init();
      const button = playButton.getButton();

      mockPlayer.getState.mockReturnValue(PlayerState.Playing);
      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Ready,
        newState: PlayerState.Playing,
      });

      expect(button?.getAttribute('aria-label')).toBe('Pause');
    });

    it('should update icon when state changes to Paused', () => {
      mockPlayer.getState.mockReturnValue(PlayerState.Playing);
      playButton.init();

      mockPlayer.getState.mockReturnValue(PlayerState.Paused);
      mockPlayer.triggerEvent('statechange', {
        oldState: PlayerState.Playing,
        newState: PlayerState.Paused,
      });

      const button = playButton.getButton();
      expect(button?.getAttribute('aria-label')).toBe('Play');
    });

    it('should display play icon in Ready state', () => {
      mockPlayer.getState.mockReturnValue(PlayerState.Ready);
      playButton.init();

      const button = playButton.getButton();
      expect(button?.getAttribute('aria-label')).toBe('Play');
    });
  });

  describe('getButton()', () => {
    it('should return null before init', () => {
      expect(playButton.getButton()).toBeNull();
    });

    it('should return button element after init', () => {
      playButton.init();

      const button = playButton.getButton();
      expect(button).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('dispose()', () => {
    it('should remove button from container', () => {
      playButton.init();

      playButton.dispose();

      expect(container.querySelector('.play-button')).toBeNull();
    });

    it('should remove event listeners', () => {
      playButton.init();

      playButton.dispose();

      expect(mockPlayer.off).toHaveBeenCalledWith('statechange', expect.any(Function));
    });

    it('should set button to null', () => {
      playButton.init();

      playButton.dispose();

      expect(playButton.getButton()).toBeNull();
    });
  });
});
